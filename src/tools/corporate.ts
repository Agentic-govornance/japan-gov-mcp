/**
 * 企業・法人・金融 ツール登録
 * dashboard_indicators, dashboard_data, houjin_search, gbiz_search, gbiz_detail, edinet_documents
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { need, txt, formatResponse } from './helpers.js';
import { getDashboardIndicators, getDashboardData } from '../providers/dashboard.js';
import * as houjin from '../providers/houjin.js';
import * as gbiz from '../providers/gbiz.js';
import * as edinet from '../providers/edinet.js';

export const metadata: Record<string, ToolMetadata> = {
  dashboard_indicators: { category: 'statistics', tags: ['macro', 'regional', 'indicator'], exampleQueries: ['統計ダッシュボードの人口系指標一覧', '地域別経済指標の検索'] },
  dashboard_data: { category: 'statistics', tags: ['time-series', 'regional'], exampleQueries: ['指標A1101の時系列データ', '東京都の失業率推移'] },
  houjin_search: { category: 'economy', tags: ['corporate', 'registry', 'legal-entity'], exampleQueries: ['法人番号1234567890123の情報取得', '株式会社○○の法人情報検索', '東京都千代田区の法人一覧'] },
  gbiz_search: { category: 'economy', tags: ['corporate', 'subsidy', 'finance'], exampleQueries: ['法人番号で企業情報検索', 'トヨタ自動車の補助金情報', '東京都の製造業企業リスト'] },
  gbiz_detail: { category: 'economy', tags: ['corporate', 'subsidy', 'patent', 'procurement'], exampleQueries: ['法人番号1234567890123の補助金受給履歴', '特定企業の特許情報取得', '調達情報の詳細'] },
  edinet_documents: { category: 'economy', tags: ['finance', 'disclosure', 'securities'], exampleQueries: ['2024年1月15日の有価証券報告書一覧', '特定日の開示書類検索'] },
};

export function register(server: McpServer, config: ServerConfig) {
  server.tool('dashboard_indicators',
    '【統計ダッシュボード】約6,000系列の統計指標を検索（登録不要）',
    { indicatorCode: z.string().max(50).optional().describe('指標コード') },
    async (p) => formatResponse(await getDashboardIndicators(p))
  );

  server.tool('dashboard_data',
    '【統計ダッシュボード】指標の時系列×地域データ取得（登録不要）',
    {
      indicatorCode: z.string().max(50).describe('指標コード'),
      regionCode: z.string().max(20).optional().describe('地域コード'),
      timeCdFrom: z.string().max(20).optional().describe('開始時点'),
      timeCdTo: z.string().max(20).optional().describe('終了時点'),
    },
    async (p) => formatResponse(await getDashboardData(p))
  );

  server.tool('houjin_search',
    '【国税庁】法人番号検索。法人番号13桁 or 法人名・所在地で検索。法人番号・商号・所在地等の基本情報を取得（HOUJIN_APP_ID必須）',
    {
      name: z.string().max(200).optional().describe('法人名（部分一致）'),
      number: z.string().regex(/^\d{13}$/).optional().describe('法人番号（13桁）'),
      address: z.string().max(200).optional().describe('所在地（部分一致）'),
      kind: z.string().max(5).optional().describe('01:国機関 02:地公体 03:登記法人 04:外国会社'),
      history: z.boolean().optional().describe('true: 変更履歴も含める（法人番号検索時のみ有効）'),
    },
    async (p) => {
      const e = need('HOUJIN_APP_ID', config.houjin.appId); if (e) return txt(e);
      return formatResponse(await houjin.searchHoujin(config.houjin, p));
    }
  );

  server.tool('gbiz_search',
    '【gBizINFO/経産省】法人の横断情報検索。法人番号または法人名・都道府県で企業情報を検索。name/corporateNumberのいずれか必須（GBIZ_TOKEN必須）',
    {
      name: z.string().max(200).optional().describe('法人名（部分一致）'),
      corporateNumber: z.string().regex(/^\d{13}$/).optional().describe('法人番号13桁'),
      prefectureCode: z.string().max(5).optional().describe('都道府県コード'),
      page: z.number().int().min(1).max(1000).optional().describe('ページ番号'),
    },
    async (p) => {
      const e = need('GBIZ_TOKEN', config.gbiz.token); if (e) return txt(e);
      return formatResponse(await gbiz.searchCorporation(config.gbiz, p));
    }
  );

  server.tool('gbiz_detail',
    '【gBizINFO/経産省】法人番号で詳細情報取得。届出認定・補助金・特許・調達・財務・表彰・職場情報の7種別（GBIZ_TOKEN必須）',
    {
      corporateNumber: z.string().regex(/^\d{13}$/).describe('法人番号13桁'),
      infoType: z.enum([
        'certification', 'subsidy', 'patent', 'procurement',
        'finance', 'commendation', 'workplace'
      ]).describe('情報種別: certification=届出認定 subsidy=補助金 patent=特許 procurement=調達 finance=財務 commendation=表彰 workplace=職場'),
    },
    async (p) => {
      const e = need('GBIZ_TOKEN', config.gbiz.token); if (e) return txt(e);
      const fn: Record<string, (c: gbiz.GbizConfig, n: string) => Promise<any>> = {
        certification: gbiz.getCertification, subsidy: gbiz.getSubsidy,
        patent: gbiz.getPatent, procurement: gbiz.getProcurement,
        finance: gbiz.getFinance, commendation: gbiz.getCommendation,
        workplace: gbiz.getWorkplace,
      };
      return formatResponse(await fn[p.infoType](config.gbiz, p.corporateNumber));
    }
  );

  server.tool('edinet_documents',
    '【EDINET/金融庁】指定日の開示書類一覧（有報/四半報等）',
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
      type: z.number().int().min(1).max(2).optional().describe('1:メタのみ 2:書類一覧+メタ'),
    },
    async (p) => {
      const e = need('EDINET_API_KEY', config.edinet.apiKey); if (e) return txt(e);
      return formatResponse(await edinet.getDocumentList(config.edinet, p));
    }
  );
}
