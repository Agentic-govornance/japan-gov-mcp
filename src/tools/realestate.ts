/**
 * 不動産・国交省DPFツール登録
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { need, txt, formatResponse } from './helpers.js';
import { getRealEstateTransactions, getLandPrice } from '../providers/realestate.js';
import * as mlitDpf from '../providers/mlit-dpf.js';

export const metadata: Record<string, ToolMetadata> = {
  realestate_transactions: { category: 'economy', tags: ['real-estate', 'transaction', 'price'], exampleQueries: ['東京都千代田区の2023年Q1不動産取引', '大阪市の土地取引価格'] },
  realestate_landprice: { category: 'economy', tags: ['real-estate', 'land-price', 'appraisal'], exampleQueries: ['東京都中央区の地価公示データ', '2024年の標準地価格'] },
  mlit_dpf_search: { category: 'geospatial', tags: ['infrastructure', 'transport', 'regional'], exampleQueries: ['道路に関するデータセット検索', '国土交通省の公共交通データ'] },
  mlit_dpf_catalog: { category: 'geospatial', tags: ['infrastructure', 'catalog'], exampleQueries: ['国交省データプラットフォームのカタログ一覧'] },
};

export function register(server: McpServer, config: ServerConfig) {
  server.tool('realestate_transactions',
    '【国土交通省】不動産取引価格情報（APIキー必要）',
    {
      year: z.string().max(10).describe('開始 YYYYQ (20231=2023年Q1)'),
      quarter: z.string().max(10).describe('終了 YYYYQ'),
      area: z.string().max(10).optional().describe('都道府県コード'),
      city: z.string().max(10).optional().describe('市区町村コード'),
    },
    async (p) => {
      const e = need('REALESTATE_API_KEY', config.realestate.apiKey); if (e) return txt(e);
      return formatResponse(await getRealEstateTransactions(config.realestate, p));
    }
  );

  server.tool('realestate_landprice',
    '【国土交通省】地価公示・地価調査（APIキー必要）',
    {
      year: z.string().max(10).describe('年 YYYY'),
      area: z.string().max(10).optional().describe('都道府県コード'),
      city: z.string().max(10).optional().describe('市区町村コード'),
    },
    async (p) => {
      const e = need('REALESTATE_API_KEY', config.realestate.apiKey); if (e) return txt(e);
      return formatResponse(await getLandPrice(config.realestate, p));
    }
  );

  server.tool('mlit_dpf_search',
    '【国交省DPF】インフラデータ横断検索（橋梁・道路・河川等）',
    {
      term: z.string().max(500).describe('検索キーワード'),
      first: z.number().int().min(0).max(10000).optional().describe('開始位置（デフォルト0）'),
      size: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト10、最大100）'),
    },
    async (p) => {
      const e = need('MLIT_DPF_API_KEY', config.mlitDpf.apiKey); if (e) return txt(e);
      return formatResponse(await mlitDpf.searchMlitDpf(config.mlitDpf, p));
    }
  );

  server.tool('mlit_dpf_catalog',
    '【国交省DPF】データカタログ詳細取得',
    {
      id: z.string().max(200).describe('カタログID'),
    },
    async (p) => {
      const e = need('MLIT_DPF_API_KEY', config.mlitDpf.apiKey); if (e) return txt(e);
      return formatResponse(await mlitDpf.getMlitDpfCatalog(config.mlitDpf, p));
    }
  );
}
