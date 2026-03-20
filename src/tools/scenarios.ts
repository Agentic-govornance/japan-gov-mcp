/**
 * シナリオ複合ツール登録
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';

import { regionalHealthEconomy, laborDemandSupply } from '../scenarios/regional-analysis.js';
import { corporateIntelligence } from '../scenarios/corporate-analysis.js';
import { disasterRiskAssessment } from '../scenarios/disaster-analysis.js';
import { academicTrend, academicTrendByTopics } from '../scenarios/academic-analysis.js';
import { realestateDemographics } from '../scenarios/realestate-analysis.js';
import { regionalEconomyFull, nationalEconomySummary } from '../scenarios/economy-analysis.js';

export const metadata: Record<string, ToolMetadata> = {
  scenario_regional_health_economy: { category: 'catalog', tags: ['scenario', 'composite', 'health', 'economy'], exampleQueries: ['東京都の医療統計と経済指標を一括取得', '地域の健康と経済の複合分析'] },
  scenario_labor_demand_supply: { category: 'catalog', tags: ['scenario', 'composite', 'labor', 'employment'], exampleQueries: ['都道府県の労働需給バランス分析', '求人と就業者数の比較'] },
  scenario_corporate_intelligence: { category: 'catalog', tags: ['scenario', 'composite', 'corporate', 'finance'], exampleQueries: ['トヨタ自動車の法人情報・補助金・開示書類を一括取得', '企業の総合情報調査'] },
  scenario_disaster_risk_assessment: { category: 'catalog', tags: ['scenario', 'composite', 'disaster', 'risk'], exampleQueries: ['東京都千代田区霞が関の災害リスク評価', '特定地点の地震・浸水・河川リスク'] },
  scenario_academic_trend: { category: 'catalog', tags: ['scenario', 'composite', 'academic', 'research'], exampleQueries: ['AI研究の学術トレンド分析', '環境問題の横断文献検索'] },
  scenario_academic_trend_by_topics: { category: 'catalog', tags: ['scenario', 'composite', 'academic', 'multi-topic'], exampleQueries: ['複数テーマの研究トレンド比較', 'AI・IoT・量子の分野別文献数'] },
  scenario_realestate_demographics: { category: 'catalog', tags: ['scenario', 'composite', 'realestate', 'demographics'], exampleQueries: ['東京都の不動産市場と人口動態', '地価と人口の相関分析'] },
  scenario_regional_economy_full: { category: 'catalog', tags: ['scenario', 'composite', 'economy', 'comprehensive'], exampleQueries: ['東京都の地域経済総合分析', 'GDP・産業・インフラの多角的評価'] },
  scenario_national_economy_summary: { category: 'catalog', tags: ['scenario', 'composite', 'economy', 'national'], exampleQueries: ['全国経済サマリー取得', '47都道府県の経済指標一覧'] },
};

export function register(server: McpServer, _config: ServerConfig) {
  server.tool('scenario_regional_health_economy',
    '【シナリオ】地域医療×マクロ経済 統合分析。NDB健診データ + 統計ダッシュボード人口 + 日銀マクロ指標を1コールで取得',
    {
      prefectureCode: z.string().regex(/^\d{2}$/).describe('都道府県コード2桁（例: "13" = 東京都）'),
      year: z.number().int().min(1950).max(2100).optional().describe('分析年（省略時は最新）'),
    },
    async (p) => formatResponse(await regionalHealthEconomy(p))
  );

  server.tool('scenario_labor_demand_supply',
    '【シナリオ】労働市場 需給分析。ハローワーク求人 + e-Stat労働力調査を統合（APIキー必要）',
    {
      prefectureCode: z.string().regex(/^\d{2}$/).describe('都道府県コード2桁'),
      occupation: z.string().max(200).optional().describe('職種キーワード（例: "看護師", "エンジニア"）'),
      appId: z.string().optional().describe('e-Stat AppID（任意）'),
    },
    async (p) => formatResponse(await laborDemandSupply(p))
  );

  server.tool('scenario_corporate_intelligence',
    '【シナリオ】企業情報統合分析。法人番号 + gBizINFO + EDINET を統合して企業の基本情報・補助金・開示書類を一括取得',
    {
      companyName: z.string().max(200).optional().describe('企業名（部分一致検索）'),
      corporateNumber: z.string().regex(/^\d{13}$/).optional().describe('法人番号13桁（完全一致）'),
      houjinAppId: z.string().optional().describe('法人番号APIキー'),
      gbizToken: z.string().optional().describe('gBizINFO APIキー'),
      edinetApiKey: z.string().optional().describe('EDINET APIキー'),
    },
    async (p) => formatResponse(await corporateIntelligence(p))
  );

  server.tool('scenario_disaster_risk_assessment',
    '【シナリオ】地域防災リスク評価。住所または座標から地震ハザード・浸水深・河川水位を統合評価（APIキー不要）',
    {
      address: z.string().max(200).optional().describe('住所（例: "東京都千代田区霞が関1-1-1"）'),
      lat: z.number().min(-90).max(90).optional().describe('緯度（住所の代わりに座標指定可）'),
      lon: z.number().min(-180).max(180).optional().describe('経度'),
    },
    async (p) => formatResponse(await disasterRiskAssessment(p))
  );

  server.tool('scenario_academic_trend',
    '【シナリオ】学術研究トレンド分析。NDL + J-STAGE + CiNii + ジャパンサーチ + AgriKnowledge を横断検索（APIキー不要）',
    {
      keyword: z.string().max(500).describe('検索キーワード（例: "AI", "環境問題"）'),
      limit: z.number().int().min(1).max(50).optional().describe('各データベースからの取得件数（デフォルト: 5）'),
      includeAgri: z.boolean().optional().describe('農業系データベース(AgriKnowledge)も含めるか'),
    },
    async (p) => formatResponse(await academicTrend(p))
  );

  server.tool('scenario_academic_trend_by_topics',
    '【シナリオ】分野別学術トレンド比較。複数のキーワードで並列検索し、分野ごとの文献数を比較（APIキー不要）',
    {
      topics: z.array(z.string().max(200)).max(10).describe('分野キーワードリスト（例: ["AI", "機械学習", "深層学習"]）'),
      limit: z.number().int().min(1).max(20).optional().describe('各トピック・各DBからの取得件数（デフォルト: 3）'),
    },
    async (p) => formatResponse(await academicTrendByTopics(p))
  );

  server.tool('scenario_realestate_demographics',
    '【シナリオ】不動産×人口動態分析。不動産取引価格 + 地価公示 + 人口統計を統合して地域市場を分析',
    {
      prefecture: z.string().max(5).optional().describe('都道府県コード2桁（例: "13" = 東京都）'),
      city: z.string().max(10).optional().describe('市区町村コード5桁（例: "13101" = 千代田区）'),
      year: z.number().int().min(1950).max(2100).optional().describe('分析年（デフォルト: 昨年）'),
      quarter: z.number().int().min(1).max(4).optional().describe('四半期（1-4, デフォルト: 1）'),
      realestateApiKey: z.string().optional().describe('不動産情報APIキー'),
    },
    async (p) => formatResponse(await realestateDemographics(p))
  );

  server.tool('scenario_regional_economy_full',
    '【シナリオ】地域経済総合分析。統計ダッシュボードGDP + 日銀マクロ + e-Stat産業統計 + 国交省DPF を統合',
    {
      prefectureCode: z.string().regex(/^\d{2}$/).describe('都道府県コード2桁（必須）'),
      year: z.number().int().min(1950).max(2100).optional().describe('分析年（省略時は最新）'),
      estatAppId: z.string().optional().describe('e-Stat AppID（産業統計取得用）'),
      mlitDpfApiKey: z.string().optional().describe('国交省DPF APIキー（インフラデータ用）'),
    },
    async (p) => formatResponse(await regionalEconomyFull(p))
  );

  server.tool('scenario_national_economy_summary',
    '【シナリオ】全国経済サマリー。統計ダッシュボードから全国の主要経済指標を一括取得（APIキー不要）',
    {},
    async () => formatResponse(await nationalEconomySummary())
  );
}
