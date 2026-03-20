/**
 * 医療・健康データ（NDB）/ 経済・金融データ（日銀）ツール登録
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';
import * as ndb from '../providers/ndb.js';
import * as boj from '../providers/boj.js';

export const metadata: Record<string, ToolMetadata> = {
  // Health / Medical
  ndb_inspection_stats: { category: 'health', tags: ['health', 'medical', 'inspection', 'statistics'], exampleQueries: ['東京都のBMI分布データ', '40-44歳男性の血圧統計', '二次医療圏別のHbA1c分布'] },
  ndb_items: { category: 'health', tags: ['health', 'medical', 'master'], exampleQueries: ['NDB検査項目一覧取得', '特定健診で取得可能な項目'] },
  ndb_areas: { category: 'health', tags: ['health', 'medical', 'master', 'regional'], exampleQueries: ['都道府県一覧取得', '二次医療圏一覧取得'] },
  ndb_range_labels: { category: 'health', tags: ['health', 'medical', 'metadata'], exampleQueries: ['BMIの範囲ラベル取得', '血圧の判定基準取得'] },
  ndb_hub_proxy: { category: 'health', tags: ['health', 'medical', 'external-mcp'], exampleQueries: ['NDB Hubで東京都のBMI分布を自然言語検索', '外部MCPエンドポイント経由でのデータ取得'] },

  // Economy / Finance (BOJ)
  boj_timeseries: { category: 'economy', tags: ['finance', 'macro', 'timeseries', 'monetary'], exampleQueries: ['M2マネーストック推移取得', 'USD/JPY為替レート時系列', '企業物価指数の推移'] },
  boj_major_statistics: { category: 'economy', tags: ['finance', 'macro', 'master'], exampleQueries: ['日銀主要統計コード一覧', 'マネタリーベース系列コード'] },
};

export function register(server: McpServer, _config: ServerConfig) {
  // ── NDB（医療・健康） ──

  server.tool('ndb_inspection_stats',
    '【NDBオープンデータ】特定健診の検査統計データ取得（BMI・血圧・血糖等）。地域・性別・年齢で絞り込み可能（APIキー不要）',
    {
      itemName: z.string().max(100).describe('検査項目名（例: BMI, 収縮期血圧, HbA1c）'),
      areaType: z.enum(['prefecture', 'secondary_medical_area']).optional().describe('地域種別: prefecture=都道府県 secondary_medical_area=二次医療圏'),
      prefectureName: z.string().max(20).optional().describe('都道府県名（例: 東京都）'),
      areaName: z.string().max(50).optional().describe('二次医療圏名'),
      gender: z.enum(['male', 'female', 'all']).optional().describe('性別'),
      ageGroup: z.string().max(10).optional().describe('年齢階級（例: 40-44, 45-49, 50-54）'),
      page: z.number().int().min(1).max(10000).optional().describe('ページ番号'),
      perPage: z.number().int().min(1).max(1000).optional().describe('1ページあたり件数'),
      recordMode: z.enum(['basic', 'detailed', 'all']).optional().describe('レコード詳細度: basic/detailed/all'),
    },
    async (p) => formatResponse(await ndb.getInspectionStats(p))
  );

  server.tool('ndb_items',
    '【NDBオープンデータ】利用可能な検査項目一覧を取得（APIキー不要）',
    {},
    async () => formatResponse(await ndb.getItems())
  );

  server.tool('ndb_areas',
    '【NDBオープンデータ】都道府県・二次医療圏の一覧を取得（APIキー不要）',
    {
      type: z.enum(['prefecture', 'secondary_medical_area']).optional().describe('地域種別（デフォルト: prefecture）'),
    },
    async (p) => formatResponse(await ndb.getAreas(p))
  );

  server.tool('ndb_range_labels',
    '【NDBオープンデータ】検査項目の値範囲ラベル取得（例: BMI「18.5未満」「18.5以上25未満」等）（APIキー不要）',
    {
      itemName: z.string().max(100).describe('検査項目名'),
      gender: z.enum(['male', 'female', 'all']).optional().describe('性別'),
    },
    async (p) => formatResponse(await ndb.getRangeLabels(p))
  );

  server.tool('ndb_hub_proxy',
    '【NDB Hub】外部MCPプロキシ。NDB OpenData Hub の独自エンドポイントに自然言語クエリを送信（APIキー不要）',
    {
      query: z.string().max(500).describe('自然言語クエリ（例: "東京都のBMI分布"）'),
      prefectureCode: z.string().max(5).optional().describe('都道府県コード2桁'),
      indicator: z.string().max(50).optional().describe('指標名（例: "BMI", "HbA1c"）'),
      gender: z.enum(['male', 'female', 'all']).optional().describe('性別'),
      ageClass: z.string().max(10).optional().describe('年齢階級（例: "40-44"）'),
    },
    async (p) => formatResponse(await ndb.ndbHubProxy(p))
  );

  // ── 日本銀行（経済・金融） ──

  server.tool('boj_timeseries',
    '【日本銀行】時系列統計データ取得。マネーストック・物価指数・為替レート等（APIキー不要・2026/2/18開始）',
    {
      seriesCode: z.string().max(50).describe('時系列コード（例: "MD02\'MAAMAG" = M2, "FEXXUSJP" = USD/JPY為替レート）'),
      fromYear: z.number().int().min(1900).max(2100).optional().describe('開始年（デフォルト: 過去10年）'),
      toYear: z.number().int().min(1900).max(2100).optional().describe('終了年（デフォルト: 今年）'),
      frequency: z.enum(['MM', 'QQ', 'AA']).optional().describe('頻度: MM=月次 QQ=四半期 AA=年次（デフォルト: MM）'),
      format: z.enum(['CSV', 'JSON']).optional().describe('レスポンス形式（デフォルト: CSV）'),
    },
    async (p) => formatResponse(await boj.getTimeSeriesData(p))
  );

  server.tool('boj_major_statistics',
    '【日本銀行】主要統計一覧取得。よく使われる時系列統計のコード一覧（APIキー不要）',
    {},
    async () => formatResponse(await boj.getMajorStatistics())
  );
}
