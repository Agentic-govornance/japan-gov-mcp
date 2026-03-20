/**
 * RESAS APIツール登録（2025-03-24 提供終了、deprecated）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';
import * as resas from '../providers/resas.js';

export const metadata: Record<string, ToolMetadata> = {
  resas_prefectures: { category: 'deprecated', tags: ['resas', 'master'], exampleQueries: [] },
  resas_cities: { category: 'deprecated', tags: ['resas', 'master'], exampleQueries: [] },
  resas_population: { category: 'deprecated', tags: ['resas', 'population'], exampleQueries: [] },
  resas_population_pyramid: { category: 'deprecated', tags: ['resas', 'population'], exampleQueries: [] },
  resas_industry: { category: 'deprecated', tags: ['resas', 'industry'], exampleQueries: [] },
  resas_tourism: { category: 'deprecated', tags: ['resas', 'tourism'], exampleQueries: [] },
  resas_finance: { category: 'deprecated', tags: ['resas', 'finance'], exampleQueries: [] },
  resas_patents: { category: 'deprecated', tags: ['resas', 'patent'], exampleQueries: [] },
};

export function register(server: McpServer, config: ServerConfig) {
  server.tool('resas_prefectures',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: estat_search（地域統計）またはdashboard_data（統計ダッシュボード）を使用すること',
    {},
    async () => formatResponse(await resas.getPrefectures(config.resas))
  );

  server.tool('resas_cities',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: estat_search（市区町村別統計）またはmlit_dpf_search（地域データ）を使用すること',
    { prefCode: z.number().int().min(1).max(47).describe('都道府県コード 1-47') },
    async (p) => formatResponse(await resas.getCities(config.resas, p))
  );

  server.tool('resas_population',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: estat_search（人口統計・統計コード00200521）またはdashboard_data（人口系指標）を使用すること',
    {
      prefCode: z.number().int().min(1).max(47).describe('都道府県コード'),
      cityCode: z.string().max(10).describe('市区町村コード（"-"で全体）'),
    },
    async (p) => formatResponse(await resas.getPopulation(config.resas, p))
  );

  server.tool('resas_population_pyramid',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: estat_search（国勢調査・統計コード00200521）を使用すること',
    {
      prefCode: z.number().int().min(1).max(47).describe('都道府県コード'),
      cityCode: z.string().max(10).describe('市区町村コード'),
      yearLeft: z.number().int().min(1900).max(2100).describe('比較年（左）'),
      yearRight: z.number().int().min(1900).max(2100).describe('比較年（右）'),
    },
    async (p) => formatResponse(await resas.getPopulationPyramid(config.resas, p))
  );

  server.tool('resas_industry',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: estat_search（経済センサス・工業統計）またはmlit_dpf_search（産業データ）を使用すること',
    {
      prefCode: z.number().int().min(1).max(47).describe('都道府県コード'),
      cityCode: z.string().max(10).describe('市区町村コード'),
      sicCode: z.string().max(5).describe('産業大分類コード'),
      simcCode: z.string().max(5).describe('産業中分類コード'),
    },
    async (p) => formatResponse(await resas.getIndustryPower(config.resas, p))
  );

  server.tool('resas_tourism',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: estat_search（観光統計）またはjapansearch_search（文化観光情報）を使用すること',
    {
      prefCode: z.number().int().min(1).max(47).describe('都道府県コード'),
      purpose: z.number().int().min(1).max(2).optional().describe('1:観光 2:業務'),
    },
    async (p) => formatResponse(await resas.getTourismForeigners(config.resas, p))
  );

  server.tool('resas_finance',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: dashboard_data（地方財政指標）またはestat_search（地方財政統計）を使用すること',
    {
      prefCode: z.number().int().min(1).max(47).describe('都道府県コード'),
      cityCode: z.string().max(10).describe('市区町村コード'),
      matter: z.number().int().min(1).max(3).describe('1:歳入 2:歳出 3:目的別歳出'),
    },
    async (p) => formatResponse(await resas.getMunicipalFinance(config.resas, p))
  );

  server.tool('resas_patents',
    '【RESAS】⚠️ DEPRECATED: RESAS APIは2025-03-24に提供終了。代替: jstage_search（学術特許検索）またはcinii_search（CiNii特許情報）を使用すること',
    {
      prefCode: z.number().int().min(1).max(47).describe('都道府県コード'),
      cityCode: z.string().max(10).describe('市区町村コード'),
    },
    async (p) => formatResponse(await resas.getPatents(config.resas, p))
  );
}
