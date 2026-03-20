/**
 * オープンデータ・地理空間 ツール登録
 * opendata_search, opendata_detail, geospatial_search, geospatial_dataset,
 * geospatial_organizations, gsi_geocode, gsi_reverse_geocode, geoshape_city,
 * geoshape_pref, safety_overseas, hellowork_search
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { need, txt, formatResponse } from './helpers.js';
import { searchDatasets, getDatasetDetail } from '../providers/datacatalog.js';
import * as geospatial from '../providers/geospatial.js';
import { geocode, reverseGeocode } from '../providers/geo.js';
import * as geoshape from '../providers/geoshape.js';
import { getSafetyInfo } from '../providers/safety.js';
import { searchJobs } from '../providers/hellowork.js';

export const metadata: Record<string, ToolMetadata> = {
  opendata_search: { category: 'catalog', tags: ['open-data', 'ckan'], exampleQueries: ['防災に関するオープンデータ検索', '自治体公開データセット一覧'] },
  opendata_detail: { category: 'catalog', tags: ['open-data', 'ckan'], exampleQueries: ['データセットIDの詳細情報取得'] },
  geospatial_search: { category: 'catalog', tags: ['geospatial', 'gis', 'map'], exampleQueries: ['G空間情報センターで地図データ検索', '衛星画像データセット検索'] },
  geospatial_dataset: { category: 'catalog', tags: ['geospatial', 'gis'], exampleQueries: ['特定地理空間データセットの詳細取得'] },
  geospatial_organizations: { category: 'catalog', tags: ['geospatial', 'organization'], exampleQueries: ['G空間情報センター提供機関一覧'] },
  gsi_geocode: { category: 'geospatial', tags: ['geocoding', 'address', 'coordinates'], exampleQueries: ['東京都千代田区霞が関1-1-1の座標取得', '住所から緯度経度変換'] },
  gsi_reverse_geocode: { category: 'geospatial', tags: ['reverse-geocoding', 'coordinates'], exampleQueries: ['緯度35.6895 経度139.6917の住所取得', '座標から住所変換'] },
  geoshape_city: { category: 'geospatial', tags: ['boundary', 'geojson', 'municipality'], exampleQueries: ['千代田区の行政区域境界GeoJSON', '市区町村コード13101の境界データ'] },
  geoshape_pref: { category: 'geospatial', tags: ['boundary', 'geojson', 'prefecture'], exampleQueries: ['東京都の都道府県境界GeoJSON', '都道府県コード13の境界データ'] },
  safety_overseas: { category: 'government', tags: ['travel', 'safety', 'foreign'], exampleQueries: ['アメリカの渡航安全情報', '中国の危険情報・感染症情報'] },
  hellowork_search: { category: 'labor', tags: ['job', 'employment', 'vacancy'], exampleQueries: ['東京都内の介護職求人検索', '地方公務員の事務職求人', '正社員エンジニア募集情報'] },
};

export function register(server: McpServer, config: ServerConfig) {
  server.tool('opendata_search',
    '【デジタル庁】data.go.jp オープンデータ横断検索（APIキー不要）',
    {
      q: z.string().max(500).optional().describe('検索クエリ'),
      fq: z.string().max(500).optional().describe('フィルタ（CKAN形式）'),
      rows: z.number().int().min(1).max(1000).optional().describe('取得件数'),
    },
    async (p) => formatResponse(await searchDatasets(p))
  );

  server.tool('opendata_detail',
    '【デジタル庁】オープンデータ詳細・ダウンロードURL',
    { id: z.string().max(200).describe('データセットID') },
    async (p) => formatResponse(await getDatasetDetail(p))
  );

  server.tool('geospatial_search',
    '【G空間情報センター】地理空間データ横断検索',
    {
      q: z.string().max(500).optional().describe('検索クエリ'),
      fq: z.string().max(500).optional().describe('フィルタ（CKAN形式）'),
      rows: z.number().int().min(1).max(1000).optional().describe('取得件数'),
      start: z.number().int().min(0).max(100000).optional().describe('開始位置'),
      sort: z.string().max(100).optional().describe('ソート順'),
    },
    async (p) => formatResponse(await geospatial.searchGeospatial(p))
  );

  server.tool('geospatial_dataset',
    '【G空間情報センター】データセット詳細',
    { id: z.string().max(200).describe('データセットID') },
    async (p) => formatResponse(await geospatial.getGeospatialDataset(p))
  );

  server.tool('geospatial_organizations',
    '【G空間情報センター】組織一覧',
    {},
    async () => formatResponse(await geospatial.listGeospatialOrganizations())
  );

  server.tool('gsi_geocode',
    '【国土地理院】住所から緯度経度を検索（APIキー不要）',
    { address: z.string().max(500).describe('住所') },
    async (p) => formatResponse(await geocode(p))
  );

  server.tool('gsi_reverse_geocode',
    '【国土地理院】緯度経度から住所を取得（APIキー不要）',
    {
      lat: z.number().min(-90).max(90).describe('緯度 -90〜90'),
      lon: z.number().min(-180).max(180).describe('経度 -180〜180'),
    },
    async (p) => formatResponse(await reverseGeocode(p))
  );

  server.tool('geoshape_city',
    '【Geoshape】市区町村境界GeoJSON取得',
    { code: z.string().max(10).describe('行政区域コード 5桁') },
    async (p) => formatResponse(await geoshape.getCityBoundary(p))
  );

  server.tool('geoshape_pref',
    '【Geoshape】都道府県境界GeoJSON取得',
    { prefCode: z.string().max(5).describe('都道府県コード 2桁') },
    async (p) => formatResponse(await geoshape.getPrefBoundary(p))
  );

  server.tool('safety_overseas',
    '【外務省】海外安全情報（XML, APIキー不要）',
    {
      regionCode: z.string().max(10).optional().describe('地域コード: 10=アジア, 20=大洋州, 30=北米, 31=欧州, 33=中南米, 40=中東, 50=アフリカ'),
      countryCode: z.string().max(10).optional().describe('国番号コード: 0086=中国, 0001=米国 等'),
    },
    async (p) => formatResponse(await getSafetyInfo(p))
  );

  server.tool('hellowork_search',
    '【ハローワーク/厚労省】求人情報検索。キーワード・都道府県・職種・雇用形態で求人を検索（HELLOWORK_API_KEY必須）',
    {
      keyword: z.string().max(500).optional().describe('検索キーワード（職種名・スキル等）'),
      prefCode: z.string().max(5).optional().describe('都道府県コード（例: 13=東京都）'),
      occupation: z.string().max(20).optional().describe('職種コード'),
      employment: z.string().max(5).optional().describe('1:正社員 2:パート・アルバイト'),
      page: z.number().int().min(1).max(1000).optional().describe('ページ番号（デフォルト: 1）'),
    },
    async (p) => {
      const e = need('HELLOWORK_API_KEY', config.hellowork.apiKey); if (e) return txt(e);
      return formatResponse(await searchJobs(config.hellowork, p));
    }
  );
}
