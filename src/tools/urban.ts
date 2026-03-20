/**
 * 都市・3Dモデル・パブコメ・中小企業支援ツール登録
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';
import { searchPlateauDatasets, getPlateauCitygml } from '../providers/plateau.js';
import { getPublicComments } from '../providers/pubcomment.js';
import * as mirasapo from '../providers/mirasapo.js';

export const metadata: Record<string, ToolMetadata> = {
  plateau_datasets: { category: 'geospatial', tags: ['3d-city', 'building', 'urban-planning', 'citygml'], exampleQueries: ['PLATEAUの東京都3D都市モデル検索', '建物LOD2データセット一覧'] },
  plateau_citygml: { category: 'geospatial', tags: ['3d-city', 'mesh', 'citygml'], exampleQueries: ['メッシュコード53394525のCityGML情報', '3D都市モデルのメッシュ検索'] },
  pubcomment_list: { category: 'government', tags: ['public-comment', 'policy', 'regulation'], exampleQueries: ['パブリックコメント意見募集中案件一覧', '環境省のパブコメ結果公示'] },
  mirasapo_search: { category: 'economy', tags: ['sme', 'case-study', 'subsidy', 'support'], exampleQueries: ['IT導入補助金の成功事例検索', '東京都の中小企業DX事例'] },
  mirasapo_detail: { category: 'economy', tags: ['sme', 'case-study', 'detail'], exampleQueries: ['事例ID指定で詳細取得'] },
  mirasapo_categories: { category: 'economy', tags: ['sme', 'master', 'category'], exampleQueries: ['業種分類マスタ取得', '支援施策カテゴリ一覧'] },
  mirasapo_regions: { category: 'economy', tags: ['sme', 'master', 'region'], exampleQueries: ['地方区分・都道府県マスタ取得'] },
};

export function register(server: McpServer, _config: ServerConfig) {
  server.tool('plateau_datasets',
    '【PLATEAU/国交省】3D都市モデルデータセット検索。都道府県・市区町村・データ種別で絞込可能（APIキー不要）',
    {
      prefecture: z.string().max(10).optional().describe('都道府県名（例: "東京都"）'),
      city: z.string().max(20).optional().describe('市区町村名（例: "千代田区"）'),
      type: z.string().max(30).optional().describe('データ種別（例: "建築物", "道路"）'),
    },
    async (p) => formatResponse(await searchPlateauDatasets(p))
  );

  server.tool('plateau_citygml',
    '【PLATEAU/国交省】メッシュコード指定でCityGML 3D都市モデル情報取得（APIキー不要）',
    {
      meshCode: z.string().regex(/^\d{8}$/).describe('8桁メッシュコード（例: "53394525"）'),
    },
    async (p) => formatResponse(await getPlateauCitygml(p))
  );

  server.tool('pubcomment_list',
    '【e-Gov】パブリックコメント（意見募集/結果公示）RSS取得（APIキー不要）',
    {
      type: z.enum(['list', 'result']).optional().describe('list=意見募集中 result=結果公示（デフォルト: list）'),
      categoryCode: z.string().max(20).optional().describe('カテゴリコード10桁（例: "0000000047"=環境保全）'),
    },
    async (p) => formatResponse(await getPublicComments(p))
  );

  server.tool('mirasapo_search',
    '【ミラサポplus/中小企業庁】中小企業の成功事例をキーワード・業種・地域で検索（APIキー不要）',
    {
      keywords: z.string().max(500).optional().describe('検索キーワード（例: "IT導入", "DX"）'),
      prefecture: z.string().max(10).optional().describe('都道府県名（例: "東京都"）'),
      industryCategory: z.string().max(20).optional().describe('業種カテゴリID（mirasapo_categoriesで取得）'),
      purposeCategory: z.string().max(20).optional().describe('課題カテゴリID（1:販路開拓 3:IT化 5:人材 等）'),
      sort: z.string().max(20).optional().describe('ソート: timestamp, popularity, number, update, name'),
      order: z.enum(['asc', 'desc']).optional().describe('順序: asc or desc'),
      limit: z.number().int().min(1).max(100).optional().describe('取得件数（1-100, デフォルト10）'),
      offset: z.number().int().min(0).max(10000).optional().describe('開始位置'),
    },
    async (p) => formatResponse(await mirasapo.searchCaseStudies(p))
  );

  server.tool('mirasapo_detail',
    '【ミラサポplus/中小企業庁】事例IDで詳細取得（背景・課題・成果・連絡先等）（APIキー不要）',
    {
      id: z.string().max(100).describe('事例ID'),
    },
    async (p) => formatResponse(await mirasapo.getCaseStudy(p))
  );

  server.tool('mirasapo_categories',
    '【ミラサポplus/中小企業庁】業種・課題・行政サービス・施策のカテゴリマスタ取得（APIキー不要）',
    {
      type: z.enum(['industries', 'purposes', 'services', 'specific_measures']).describe('カテゴリ種別: industries=業種 purposes=課題 services=行政サービス specific_measures=施策'),
    },
    async (p) => formatResponse(await mirasapo.getCategories(p))
  );

  server.tool('mirasapo_regions',
    '【ミラサポplus/中小企業庁】地方区分・都道府県マスタ取得（APIキー不要）',
    {},
    async () => formatResponse(await mirasapo.getRegions())
  );
}
