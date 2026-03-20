/**
 * 統合ツール登録（カタログ・横断検索）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { need, json, txt } from './helpers.js';

import * as estat from '../providers/estat.js';
import * as houjin from '../providers/houjin.js';
import * as gbiz from '../providers/gbiz.js';
import { getDashboardIndicators } from '../providers/dashboard.js';
import { searchLawsByKeyword } from '../providers/law.js';
import { searchDatasets } from '../providers/datacatalog.js';
import type { ApiResponse } from '../utils/http.js';

export const metadata: Record<string, ToolMetadata> = {
  gov_api_catalog: { category: 'catalog', tags: ['meta', 'api-list'], exampleQueries: ['利用可能なAPI一覧確認', 'APIキー設定状況の確認'] },
  gov_cross_search: { category: 'catalog', tags: ['meta', 'cross-search'], exampleQueries: ['複数APIで横断検索', '環境というキーワードで全API検索'] },
};

export function register(server: McpServer, config: ServerConfig, allMetadata: Record<string, ToolMetadata>) {
  server.tool('gov_api_catalog',
    '【統合】全API・全ツール一覧（カテゴリ・タグ・使用例付き）。どのツールが利用可能か確認',
    {
      category: z.enum(['statistics', 'law', 'economy', 'geospatial', 'disaster', 'labor', 'academic', 'science', 'health', 'government', 'catalog', 'deprecated', 'all']).optional().describe('カテゴリフィルタ'),
      includeMetadata: z.boolean().optional().describe('true: タグ・使用例も表示'),
    },
    async (p) => {
      const filterCat = p.category && p.category !== 'all' ? p.category : null;
      const showMeta = p.includeMetadata ?? false;

      const tools = Object.entries(allMetadata)
        .filter(([_, meta]) => !filterCat || meta.category === filterCat)
        .map(([name, meta]) => ({ name, ...meta }));

      let o = `# japan-gov-mcp Tool Catalog\n\n`;
      o += `📦 ${tools.length} tools${filterCat ? ` (category: ${filterCat})` : ''}\n\n`;

      if (showMeta) {
        o += `⚠️ RESAS API は 2025-03-24 に提供終了。代替: V-RESAS（民間）、e-Stat (estat_*)、統計ダッシュボード (dashboard_*)、国交省DPF (mlit_dpf_*)、地価公示 (realestate_*) を使用すること。\n\n`;
      }

      const categories = ['statistics', 'economy', 'law', 'geospatial', 'disaster', 'labor', 'academic', 'science', 'health', 'government', 'catalog', 'deprecated'] as const;
      for (const cat of categories) {
        const catTools = tools.filter(t => t.category === cat);
        if (catTools.length === 0) continue;

        o += `## ${cat.toUpperCase()} (${catTools.length})\n\n`;
        for (const tool of catTools) {
          o += `### ${tool.name}\n`;
          o += `- **Tags**: ${tool.tags.join(', ')}\n`;
          if (showMeta && tool.exampleQueries.length > 0) {
            o += `- **Examples**:\n`;
            tool.exampleQueries.forEach(q => { o += `  - ${q}\n`; });
          }
          o += `\n`;
        }
      }

      o += `\n---\n\n**API Status Summary**:\n`;
      const apis = [
        { name: 'e-Stat', key: 'ESTAT_APP_ID', ok: !!config.estat.appId },
        { name: 'RESAS (廃止)', key: 'RESAS_API_KEY', ok: false },
        { name: '法人番号', key: 'HOUJIN_APP_ID', ok: !!config.houjin.appId },
        { name: 'gBizINFO', key: 'GBIZ_TOKEN', ok: !!config.gbiz.token },
        { name: 'EDINET', key: 'EDINET_API_KEY', ok: !!config.edinet.apiKey },
        { name: 'ハローワーク', key: 'HELLOWORK_API_KEY', ok: !!config.hellowork.apiKey },
        { name: '不動産情報', key: 'REALESTATE_API_KEY', ok: !!config.realestate.apiKey },
        { name: '国交省DPF', key: 'MLIT_DPF_API_KEY', ok: !!config.mlitDpf.apiKey },
        { name: '海しる (MSIL)', key: 'MSIL_API_KEY', ok: !!config.msil.apiKey },
        { name: 'ODPT公共交通', key: 'ODPT_API_KEY', ok: !!config.odpt.apiKey },
      ];
      apis.forEach(a => { o += `- ${a.ok ? '✅' : '❌'} ${a.name} (${a.key})\n`; });

      return txt(o);
    }
  );

  server.tool('gov_cross_search',
    '【統合】複数APIを横断検索。企業名/地域/テーマで関連データを一括取得。メタデータベースのインテリジェントルーティング対応',
    {
      query: z.string().max(500).describe('検索クエリ'),
      scope: z.array(z.enum(['statistics', 'corporate', 'regional', 'legal', 'all']))
        .optional().describe('スコープ（statistics/corporate/regional/legal/all）'),
    },
    async (p) => {
      const scope = (p.scope && p.scope.length > 0) ? p.scope : ['all'];
      const all = scope.includes('all');
      const results: Record<string, unknown> = {};
      const errors: string[] = [];
      const skipped: string[] = [];
      const tasks: Promise<void>[] = [];

      function collect(label: string, fn: () => Promise<ApiResponse>) {
        tasks.push(
          fn().then(res => {
            if (res.success) { results[label] = res.data; }
            else { errors.push(`${label}: ${res.error}`); }
          }).catch(e => { errors.push(`${label}: ${String(e)}`); })
        );
      }

      // statistics: 政府統計検索
      if (all || scope.includes('statistics')) {
        if (config.estat.appId) {
          collect('e-Stat', () => estat.getStatsList(config.estat, { searchWord: p.query, limit: 5 }));
        } else {
          skipped.push('e-Stat (ESTAT_APP_ID 未設定)');
        }
        collect('オープンデータ', () => searchDatasets({ q: p.query, rows: 5 }));
      }

      // corporate: 法人情報検索
      if (all || scope.includes('corporate')) {
        if (config.houjin.appId) {
          collect('法人番号', () => houjin.searchHoujin(config.houjin, { name: p.query }));
        } else {
          skipped.push('法人番号 (HOUJIN_APP_ID 未設定)');
        }
        if (config.gbiz.token) {
          collect('gBizINFO', () => gbiz.searchCorporation(config.gbiz, { name: p.query }));
        } else {
          skipped.push('gBizINFO (GBIZ_TOKEN 未設定)');
        }
      }

      // regional: 地域統計指標（APIキー不要）
      // 注: 統計ダッシュボードAPIはキーワード検索をサポートしないため、全指標一覧を返す
      if (all || scope.includes('regional')) {
        collect('統計ダッシュボード', () => getDashboardIndicators({}));
      }

      // legal: 法令キーワード検索（APIキー不要）
      if (all || scope.includes('legal')) {
        collect('法令検索', () => searchLawsByKeyword({ keyword: p.query, limit: 5 }));
      }

      await Promise.allSettled(tasks);

      // LLM向け整形
      const sections: string[] = [];
      sections.push(`# 横断検索: "${p.query}"\n`);
      sections.push(`スコープ: ${scope.join(', ')}`);

      const labels = Object.keys(results);
      if (labels.length > 0) {
        sections.push(`\n## 検索結果 (${labels.length}件ヒット)\n`);
        for (const label of labels) {
          sections.push(`### ${label}\n${json(results[label])}`);
        }
      } else {
        sections.push('\n該当データなし');
      }

      if (skipped.length > 0) {
        sections.push(`\n## スキップ（APIキー未設定）\n${skipped.map(s => `- ${s}`).join('\n')}`);
      }

      if (errors.length > 0) {
        sections.push(`\n## エラー\n${errors.map(e => `- ${e}`).join('\n')}`);
      }

      sections.push(`\n---\n取得時刻: ${new Date().toISOString()}`);
      return txt(sections.join('\n'));
    }
  );
}
