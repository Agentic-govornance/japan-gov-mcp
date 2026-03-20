/**
 * 学術・研究・科学・環境 ツール登録
 * ndl_search, jstage_search, cinii_search, japansearch_search,
 * kokkai_speeches, kokkai_meetings, kkj_search,
 * soramame_air, geology_legend, geology_at_point,
 * jaxa_collections, agriknowledge_search, irdb_search, researchmap_achievements
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';
import { searchNdl, searchJstage, searchJapanSearch, searchCinii, searchIrdb } from '../providers/academic.js';
import { searchKokkaiSpeeches, searchKokkaiMeetings } from '../providers/kokkai.js';
import { searchKkj } from '../providers/kkj.js';
import { getAirQuality, getGeologyLegend, getGeologyAtPoint, getJaxaCollections } from '../providers/science.js';
import { searchAgriKnowledge } from '../providers/agriknowledge.js';
import { getResearcherAchievements } from '../providers/researchmap.js';

export const metadata: Record<string, ToolMetadata> = {
  ndl_search: { category: 'academic', tags: ['library', 'book', 'bibliography'], exampleQueries: ['国立国会図書館で統計学の書籍検索', 'ISBN検索'] },
  jstage_search: { category: 'academic', tags: ['journal', 'paper', 'research'], exampleQueries: ['J-STAGEで機械学習の論文検索', '著者名で学術論文検索'] },
  cinii_search: { category: 'academic', tags: ['journal', 'paper', 'research'], exampleQueries: ['CiNiiで量子コンピュータの論文検索', '大学紀要の検索'] },
  japansearch_search: { category: 'academic', tags: ['culture', 'heritage', 'archive'], exampleQueries: ['ジャパンサーチで浮世絵検索', '文化財・美術作品の横断検索'] },
  kokkai_speeches: { category: 'government', tags: ['parliament', 'speech', 'debate'], exampleQueries: ['国会会議録で環境問題の発言検索', '特定議員の発言履歴'] },
  kokkai_meetings: { category: 'government', tags: ['parliament', 'meeting', 'session'], exampleQueries: ['2023年通常国会の会議一覧', '予算委員会の開催履歴'] },
  kkj_search: { category: 'government', tags: ['procurement', 'tender', 'sme'], exampleQueries: ['官公需情報で入札案件検索', '中小企業向け調達情報'] },
  soramame_air: { category: 'science', tags: ['environment', 'air-quality', 'pollution'], exampleQueries: ['東京都の大気汚染データ', 'PM2.5の観測値取得'] },
  geology_legend: { category: 'science', tags: ['geology', 'map', 'legend'], exampleQueries: ['地質図の凡例情報取得', '地質記号の説明'] },
  geology_at_point: { category: 'science', tags: ['geology', 'map', 'soil'], exampleQueries: ['東京駅の地質情報', '緯度経度の地層データ'] },
  jaxa_collections: { category: 'science', tags: ['satellite', 'earth-observation', 'jaxa'], exampleQueries: ['JAXA衛星データコレクション一覧', '地球観測衛星データセット'] },
  agriknowledge_search: { category: 'academic', tags: ['agriculture', 'research', 'paper'], exampleQueries: ['AgriKnowledgeで稲作技術の文献検索', '農業研究成果の検索'] },
  irdb_search: { category: 'academic', tags: ['repository', 'thesis', 'research', 'open-access'], exampleQueries: ['IRDBで大学紀要・博士論文を検索', '機関リポジトリの研究成果検索'] },
  researchmap_achievements: { category: 'academic', tags: ['researcher', 'profile', 'achievements'], exampleQueries: ['研究者の業績一覧取得', '論文・受賞歴の取得'] },
};

export function register(server: McpServer, _config: ServerConfig) {
  server.tool('ndl_search',
    '【国立国会図書館】書籍・雑誌・論文を横断検索（APIキー不要）',
    {
      query: z.string().max(500).describe('検索キーワード'),
      count: z.number().int().min(1).max(500).optional().describe('取得件数（デフォルト20）'),
    },
    async (p) => formatResponse(await searchNdl(p))
  );

  server.tool('jstage_search',
    '【J-STAGE】日本の学術論文を検索（APIキー不要）',
    {
      query: z.string().max(500).describe('検索キーワード'),
      count: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト20）'),
      start: z.number().int().min(1).max(10000).optional().describe('開始位置（デフォルト1）'),
      pubyearfrom: z.string().max(4).optional().describe('公開年From（YYYY）'),
      pubyearto: z.string().max(4).optional().describe('公開年To（YYYY）'),
    },
    async (p) => formatResponse(await searchJstage(p))
  );

  server.tool('cinii_search',
    '【CiNii Research/NII】国内学術論文・研究データ横断検索',
    {
      query: z.string().max(500).describe('検索キーワード'),
      count: z.number().int().min(1).max(200).optional().describe('取得件数（デフォルト20）'),
    },
    async (p) => formatResponse(await searchCinii({ ...p, count: p.count || 20 }))
  );

  server.tool('japansearch_search',
    '【ジャパンサーチ】デジタルアーカイブ横断検索（APIキー不要）',
    {
      keyword: z.string().max(500).describe('検索キーワード'),
      size: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト20）'),
      from: z.number().int().min(0).max(10000).optional().describe('開始オフセット（デフォルト0）'),
    },
    async (p) => formatResponse(await searchJapanSearch(p))
  );

  server.tool('kokkai_speeches',
    '【国立国会図書館】国会会議録の発言検索（本文あり, APIキー不要）',
    {
      any: z.string().max(500).optional().describe('キーワード（AND検索）'),
      speaker: z.string().max(100).optional().describe('発言者名'),
      nameOfHouse: z.string().max(20).optional().describe('院（衆議院/参議院/両院）'),
      nameOfMeeting: z.string().max(100).optional().describe('会議名'),
      from: z.string().max(10).optional().describe('開催日From（YYYY-MM-DD）'),
      until: z.string().max(10).optional().describe('開催日To（YYYY-MM-DD）'),
      maximumRecords: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト20）'),
      startRecord: z.number().int().min(1).max(100000).optional().describe('開始位置（デフォルト1）'),
      recordPacking: z.string().max(10).optional().describe('レスポンス形式（json固定推奨）'),
    },
    async (p) => formatResponse(await searchKokkaiSpeeches(p))
  );

  server.tool('kokkai_meetings',
    '【国立国会図書館】国会会議録の会議一覧検索（本文なし, APIキー不要）',
    {
      any: z.string().max(500).optional().describe('キーワード（AND検索）'),
      speaker: z.string().max(100).optional().describe('発言者名'),
      nameOfHouse: z.string().max(20).optional().describe('院（衆議院/参議院/両院）'),
      nameOfMeeting: z.string().max(100).optional().describe('会議名'),
      from: z.string().max(10).optional().describe('開催日From（YYYY-MM-DD）'),
      until: z.string().max(10).optional().describe('開催日To（YYYY-MM-DD）'),
      maximumRecords: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト20）'),
      startRecord: z.number().int().min(1).max(100000).optional().describe('開始位置（デフォルト1）'),
      recordPacking: z.string().max(10).optional().describe('レスポンス形式（json固定推奨）'),
    },
    async (p) => formatResponse(await searchKokkaiMeetings(p))
  );

  server.tool('kkj_search',
    '【中小企業庁】官公需情報ポータルの入札・調達案件検索（XML, APIキー不要）',
    {
      Query: z.string().max(500).optional().describe('キーワード'),
      Project_Name: z.string().max(200).optional().describe('入札件名'),
      Organization_Name: z.string().max(200).optional().describe('機関名'),
      CFT_Issue_Date: z.string().max(30).optional().describe('公告日（期間 YYYY-MM-DD/YYYY-MM-DD）'),
      Tender_Submission_Deadline: z.string().max(30).optional().describe('入札締切日（期間 YYYY-MM-DD/YYYY-MM-DD）'),
      Area: z.string().max(100).optional().describe('地域'),
      Count: z.number().int().min(1).max(100).optional().describe('取得件数（最大100）'),
      Start: z.number().int().min(1).max(100000).optional().describe('開始位置（デフォルト1）'),
    },
    async (p) => formatResponse(await searchKkj(p))
  );

  server.tool('soramame_air',
    '【環境省】大気汚染リアルタイムデータ（そらまめくん）（APIキー不要）',
    { stationCode: z.string().max(20).optional().describe('測定局コード（省略時は全局最新値）') },
    async (p) => formatResponse(await getAirQuality(p))
  );

  server.tool('geology_legend',
    '【産総研】シームレス地質図 凡例一覧（APIキー不要）',
    {},
    async () => formatResponse(await getGeologyLegend())
  );

  server.tool('geology_at_point',
    '【産総研】指定地点の地質情報取得（APIキー不要）',
    {
      lat: z.number().min(-90).max(90).describe('緯度 -90〜90'),
      lon: z.number().min(-180).max(180).describe('経度 -180〜180'),
    },
    async (p) => formatResponse(await getGeologyAtPoint(p))
  );

  server.tool('jaxa_collections',
    '【JAXA】衛星観測データコレクション一覧（APIキー不要）',
    { limit: z.number().int().min(1).max(200).optional().describe('取得件数（デフォルト20）') },
    async (p) => formatResponse(await getJaxaCollections(p))
  );

  server.tool('agriknowledge_search',
    '【農研機構】農業技術・試験研究成果を検索',
    {
      query: z.string().max(500).describe('検索キーワード'),
      count: z.number().int().min(1).max(200).optional().describe('取得件数（デフォルト20）'),
    },
    async (p) => formatResponse(await searchAgriKnowledge({ ...p, count: p.count || 20 }))
  );

  server.tool('irdb_search',
    '【IRDB/NII】学術機関リポジトリの研究成果（紀要・博士論文等）を横断検索（APIキー不要）',
    {
      query: z.string().max(500).optional().describe('キーワード'),
      title: z.string().max(500).optional().describe('タイトル'),
      author: z.string().max(200).optional().describe('著者名'),
      count: z.number().int().min(1).max(200).optional().describe('取得件数（デフォルト20）'),
    },
    async (p) => formatResponse(await searchIrdb(p))
  );

  server.tool('researchmap_achievements',
    '【researchmap/JST】研究者の業績情報（論文・受賞・研究分野等）取得（APIキー不要）',
    {
      permalink: z.string().max(100).describe('研究者パーマリンク（例: "SatoshiMatsuokaHPC"）'),
      achievementType: z.enum(['published_papers', 'presentations', 'research_projects', 'awards', 'misc', 'books_etc', 'research_areas', 'works']).describe('業績種別'),
      limit: z.number().int().min(1).max(100).optional().describe('取得件数'),
      start: z.number().int().min(1).max(10000).optional().describe('開始位置'),
    },
    async (p) => formatResponse(await getResearcherAchievements(p))
  );
}
