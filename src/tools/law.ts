/**
 * 法令APIツール登録
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';
import { searchLaws, getLawData, searchLawsByKeyword } from '../providers/law.js';

export const metadata: Record<string, ToolMetadata> = {
  law_search: { category: 'law', tags: ['legislation', 'regulation'], exampleQueries: ['民法の検索', '労働基準法の条文取得', '会社法施行規則'] },
  law_data: { category: 'law', tags: ['legislation', 'full-text'], exampleQueries: ['民法の全文取得', '法令番号325AC0000000089の内容'] },
  law_keyword_search: { category: 'law', tags: ['legislation', 'keyword'], exampleQueries: ['ハラスメントに関する法令検索', '環境保護関連法規の全文検索'] },
};

export function register(server: McpServer, _config: ServerConfig) {
  server.tool('law_search',
    '【法令API V2】法令一覧取得（JSON, APIキー不要）',
    {
      category: z.number().int().min(1).max(6).optional().describe('1:憲法 2:法律 3:政令 4:勅令 5:府省令 6:規則'),
      offset: z.number().int().min(0).max(100000).optional().describe('取得開始オフセット（デフォルト0）'),
      limit: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト20）'),
    },
    async (p) => formatResponse(await searchLaws(p))
  );

  server.tool('law_data',
    '【法令API V2】法令本文取得（JSON, APIキー不要）',
    {
      lawId: z.string().max(50).describe('法令ID or 法令番号 (例: 129AC0000000089)'),
    },
    async (p) => formatResponse(await getLawData(p))
  );

  server.tool('law_keyword_search',
    '【法令API V2】キーワードで法令を検索（APIキー不要）',
    {
      keyword: z.string().max(500).describe('検索キーワード'),
      offset: z.number().int().min(0).max(100000).optional().describe('取得開始オフセット（デフォルト0）'),
      limit: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト20）'),
    },
    async (p) => formatResponse(await searchLawsByKeyword(p))
  );
}
