/**
 * 統計ツール登録（e-Stat / SSDS / 自治体分析）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { need, json, txt, formatResponse } from './helpers.js';

import * as estat from '../providers/estat.js';
import { browseIndicators, getIndicatorInfo, getRelatedIndicators, getRecommendedCode, listSections } from '../utils/ssds-registry.js';
import { checkMetricsAvailability, listMetrics, getMetricUnit } from '../utils/metric-scope.js';
import { checkMergerWarning, checkMergerWarnings, listMergers } from '../utils/merger.js';
import { computeStandardDerived, computeCorrelationMatrix, alignTimeSeries, safeDiv, pct, per10k } from '../utils/derived.js';
import type { MuniDataRow } from '../utils/derived.js';

export const metadata: Record<string, ToolMetadata> = {
  estat_search: { category: 'statistics', tags: ['population', 'labor', 'macro', 'census', 'household'], exampleQueries: ['1970年以降の都道府県別人口推移', '国家公務員の超過勤務時間の統計', '県別GDP推移データ'] },
  estat_meta: { category: 'statistics', tags: ['metadata', 'table-info'], exampleQueries: ['統計表0003410379のメタデータ取得', '国勢調査の表構造確認'] },
  estat_data: { category: 'statistics', tags: ['data-download', 'time-series'], exampleQueries: ['統計表0003410379の全データ取得', '2020年国勢調査の東京都データ'] },
  estat_browse_indicators: { category: 'statistics', tags: ['ssds', 'indicator', 'browse', 'municipality'], exampleQueries: ['SSDS経済基盤の指標コード一覧', '事業所数の指標コード確認', 'テーブル0000020103の全指標'] },
  estat_check_availability: { category: 'statistics', tags: ['ssds', 'granularity', 'availability'], exampleQueries: ['市区町村レベルで利用可能な指標一覧', 'RevPARは市区町村で取得可能か', '人口・財政・経済指標の利用可否チェック'] },
  estat_merger_check: { category: 'statistics', tags: ['municipality', 'merger', 'boundary'], exampleQueries: ['長門市の合併情報確認', '35211のデータは合併境界を跨ぐか', '温泉観光地の合併影響チェック'] },
  estat_compare_municipalities: { category: 'statistics', tags: ['municipality', 'comparison', 'derived'], exampleQueries: ['長門市vs箱根町の産業構造比較', '8温泉観光地の経済指標横並び', '自治体間の生産性比較'] },
  estat_time_series: { category: 'statistics', tags: ['time-series', 'alignment', 'municipality'], exampleQueries: ['長門市の人口・事業所数の時系列推移', '2000-2020年の自治体指標推移', '異なる調査周期の指標を整列'] },
  estat_correlation: { category: 'statistics', tags: ['correlation', 'analysis', 'municipality'], exampleQueries: ['高齢化率と財政力の相関分析', '宿泊業従業者比率と売上の相関', '自治体指標の相関行列'] },
  estat_session_init: { category: 'statistics', tags: ['session', 'preflight', 'municipality'], exampleQueries: ['自治体分析セッション初期化', '長門市分析の事前チェック', '合併・粒度・指標の一括検証'] },
};

export function register(server: McpServer, config: ServerConfig) {
  server.tool('estat_search',
    '【e-Stat】政府統計を横断検索。国勢調査/GDP/CPI/家計調査等、全府省の統計表をキーワード・分野・調査年で検索',
    {
      searchWord: z.string().max(500).optional().describe('検索キーワード'),
      surveyYears: z.string().max(50).optional().describe('調査年 YYYY or YYYYMM-YYYYMM'),
      statsField: z.string().max(10).optional().describe('統計分野コード 2桁:大分類 4桁:小分類'),
      statsCode: z.string().max(10).optional().describe('政府統計コード 5桁:機関 8桁:統計'),
      limit: z.number().int().min(1).max(1000).optional().describe('取得件数（デフォルト20）'),
      lang: z.string().max(2).optional().describe('J:日本語 E:英語'),
    },
    async (p) => {
      const e = need('ESTAT_APP_ID', config.estat.appId); if (e) return txt(e);
      return formatResponse(await estat.getStatsList(config.estat, { ...p, limit: p.limit || 20 }));
    }
  );

  server.tool('estat_meta',
    '【e-Stat】統計表のメタ情報（項目定義・分類コード一覧）を取得',
    {
      statsDataId: z.string().max(20).describe('統計表ID'),
      lang: z.string().max(2).optional().describe('言語'),
    },
    async (p) => {
      const e = need('ESTAT_APP_ID', config.estat.appId); if (e) return txt(e);
      return formatResponse(await estat.getMetaInfo(config.estat, p));
    }
  );

  server.tool('estat_data',
    '【e-Stat】統計データ取得。時間・地域・分類で絞込可能',
    {
      statsDataId: z.string().max(20).describe('統計表ID'),
      cdTime: z.string().max(50).optional().describe('時間コード'),
      cdArea: z.string().max(50).optional().describe('地域コード'),
      cdCat01: z.string().max(50).optional().describe('分類事項01'),
      cdCat02: z.string().max(50).optional().describe('分類事項02'),
      startPosition: z.number().int().min(0).max(1000000).optional().describe('取得開始位置'),
      limit: z.number().int().min(1).max(100000).optional().describe('取得件数（最大100000）'),
      lang: z.string().max(2).optional().describe('言語'),
    },
    async (p) => {
      const e = need('ESTAT_APP_ID', config.estat.appId); if (e) return txt(e);
      return formatResponse(await estat.getStatsData(config.estat, p));
    }
  );

  // ════════════════════════════════════════════════
  //  自治体分析ツール群（SSDS指標・合併・比較・時系列・相関）
  // ════════════════════════════════════════════════

  server.tool('estat_browse_indicators',
    '【e-Stat/SSDS】社会・人口統計体系の指標コードをブラウズ。テーブルID/セクション/キーワードで検索。C2107(旧)→C2108(推奨)のような同概念別コードの発見に使用',
    {
      tableId: z.string().max(20).optional().describe('SSDSテーブルID（例: 0000020101=人口, 0000020103=経済, 0000020104=行政）'),
      keyword: z.string().max(200).optional().describe('検索キーワード（例: 事業所, 人口, 財政）'),
      section: z.string().max(5).optional().describe('セクションコード（A=人口, C=経済, D=行政）'),
      recommendedOnly: z.boolean().optional().describe('trueで推奨コードのみ表示（legacy/alternativeを除外）'),
    },
    async (p) => {
      const results = browseIndicators(p);
      if (results.length === 0) {
        return txt('該当する指標が見つかりません。\n\n利用可能セクション:\n' + json(listSections()));
      }
      const lines = results.map(i => {
        let line = `${i.code} | ${i.label} | ${i.unit} | ${i.recommendation}`;
        if (i.relatedCodes?.length) line += ` | 関連: ${i.relatedCodes.join(',')}`;
        if (i.notes) line += `\n  → ${i.notes}`;
        return line;
      });
      return txt(`# SSDS指標一覧 (${results.length}件)\n\nコード | ラベル | 単位 | 推奨度\n${lines.join('\n')}\n\nセクション: ${json(listSections())}`);
    }
  );

  server.tool('estat_check_availability',
    '【自治体分析】指標の利用可能性を事前チェック。市区町村/都道府県/全国レベルでのデータ取得可否、利用可能年次、代替手段を返す',
    {
      metricIds: z.array(z.string().max(50)).max(50).describe('チェックする指標IDの配列（例: ["population","revpar","fiscal_strength_index"]）'),
      granularity: z.enum(['municipality', 'prefecture', 'national']).optional().describe('取得したい粒度（デフォルト: municipality）'),
    },
    async (p) => {
      const result = checkMetricsAvailability(p.metricIds, p.granularity ?? 'municipality');
      const lines: string[] = ['# 指標利用可能性チェック\n'];

      if (result.available.length > 0) {
        lines.push(`## ✅ 利用可能 (${result.available.length}件)`);
        for (const a of result.available) {
          lines.push(`- **${a.metric}** (${a.name}): ${a.unit} [${a.source}]`);
          if (a.availableYears) lines.push(`  年次: ${a.availableYears.join(', ')}`);
          if (a.surveyCycle) lines.push(`  調査周期: ${a.surveyCycle}`);
        }
      }

      if (result.unavailable.length > 0) {
        lines.push(`\n## ❌ 利用不可 (${result.unavailable.length}件)`);
        for (const u of result.unavailable) {
          lines.push(`- **${u.metric}** (${u.name}): ${u.reason}`);
          if (u.alternative) lines.push(`  代替: ${u.alternative}`);
          if (u.availableAt) lines.push(`  利用可能粒度: ${u.availableAt}`);
        }
      }

      lines.push(`\n---\n全登録指標数: ${listMetrics().length}`);
      return txt(lines.join('\n'));
    }
  );

  server.tool('estat_merger_check',
    '【自治体分析】市区町村合併の境界検知。平成の大合併（1999-2010）を中心に、時系列データが合併境界を跨ぐかチェックし警告を生成',
    {
      codes: z.array(z.string().max(10)).max(100).describe('市区町村コードの配列（5桁、例: ["35211","14382"]）'),
      years: z.array(z.number().int().min(1900).max(2100)).max(50).optional().describe('チェック対象年のリスト（例: [2000,2005,2010,2015,2020]）'),
      listAll: z.boolean().optional().describe('trueで登録済み全合併情報を表示'),
    },
    async (p) => {
      if (p.listAll) {
        const all = listMergers();
        const lines = all.map(m =>
          `${m.code} ${m.name} (${m.mergerDate}) ← ${m.preMergerEntities.map(e => e.name).join('+')} [${m.type}]`
        );
        return txt(`# 登録済み合併情報 (${all.length}件)\n\n${lines.join('\n')}`);
      }

      const warnings = checkMergerWarnings(p.codes, p.years);
      if (warnings.length === 0) {
        return txt(`# 合併チェック結果\n\n指定された${p.codes.length}自治体に合併境界の問題はありません。`);
      }

      const lines: string[] = ['# ⚠️ 合併境界警告\n'];
      for (const w of warnings) {
        lines.push(`## ${w.name} (${w.code}) — ${w.severity}`);
        lines.push(w.message);
        lines.push(`合併構成: ${w.preMergerNames.join(', ')}`);
        if (w.affectedYears.before.length > 0) {
          lines.push(`合併前データ年: ${w.affectedYears.before.join(', ')}`);
          lines.push(`合併後データ年: ${w.affectedYears.after.join(', ')}`);
        }
        lines.push('');
      }
      return txt(lines.join('\n'));
    }
  );

  server.tool('estat_compare_municipalities',
    '【e-Stat/SSDS】複数自治体のSSDSデータを取得し派生指標（構成比・人口あたり率・ランキング）を自動計算。自治体間の横並び比較に最適',
    {
      codes: z.array(z.string().max(10)).max(50).describe('市区町村コード配列（5桁、例: ["35211","14382","10426"]）'),
      indicators: z.array(z.string().max(20)).max(50).describe('SSDS指標コード配列（例: ["A1101","C2108","C210847","D2201"]）'),
      year: z.string().max(10).optional().describe('取得年（例: "2020"）。省略時は最新データ'),
      tableId: z.string().max(20).optional().describe('SSDSテーブルID（例: "0000020101"）。省略時は指標コードから自動判定'),
    },
    async (p) => {
      const e = need('ESTAT_APP_ID', config.estat.appId); if (e) return txt(e);

      // 指標情報を取得して必要なテーブルを特定
      const tableIds = new Set<string>();
      const indicatorInfos: Record<string, { label: string; unit: string }> = {};
      for (const code of p.indicators) {
        const info = getIndicatorInfo(code);
        if (info) {
          tableIds.add(info.table);
          indicatorInfos[code] = { label: info.label, unit: info.unit };
          // legacy コードなら推奨を提案
          const rec = getRecommendedCode(code);
          if (rec && rec.code !== code) {
            indicatorInfos[code].label += ` ⚠️推奨: ${rec.code}(${rec.label})`;
          }
        }
      }
      if (p.tableId) tableIds.add(p.tableId);

      // 合併チェック
      const mergerWarnings = checkMergerWarnings(p.codes, p.year ? [parseInt(p.year)] : undefined);

      // 各テーブル×各自治体でデータ取得
      const allData: Record<string, Record<string, number | null>> = {};
      const errors: string[] = [];

      for (const code of p.codes) {
        allData[code] = {};
        for (const tbl of tableIds) {
          try {
            const res = await estat.getStatsData(config.estat, {
              statsDataId: tbl,
              cdArea: code,
              cdTime: p.year,
              limit: 10000,
            });
            if (res.success && res.data) {
              const dataObj = res.data as any;
              const values = dataObj?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
              if (Array.isArray(values)) {
                for (const v of values) {
                  const cat = v['@cat01'] || v['@cat02'];
                  if (cat && p.indicators.includes(cat)) {
                    const val = v['$'];
                    allData[code][cat] = val === '-' || val === 'x' || val === '***' ? null : (Number.isFinite(parseFloat(val)) ? parseFloat(val) : null);
                  }
                }
              }
            } else {
              errors.push(`${code}/${tbl}: ${res.error}`);
            }
          } catch (err) {
            errors.push(`${code}/${tbl}: ${String(err)}`);
          }
        }
      }

      // 結果整形
      const lines: string[] = ['# 自治体比較データ\n'];

      // ヘッダー行
      const header = ['指標', '単位', ...p.codes];
      lines.push(`| ${header.join(' | ')} |`);
      lines.push(`| ${header.map(() => '---').join(' | ')} |`);

      for (const ind of p.indicators) {
        const info = indicatorInfos[ind] || { label: ind, unit: '—' };
        const vals = p.codes.map(code => {
          const v = allData[code]?.[ind];
          return v !== null && v !== undefined ? v.toLocaleString() : '---';
        });
        lines.push(`| ${info.label}(${ind}) | ${info.unit} | ${vals.join(' | ')} |`);
      }

      // 合併警告
      if (mergerWarnings.length > 0) {
        lines.push('\n## ⚠️ 合併境界注意');
        for (const w of mergerWarnings) {
          lines.push(`- ${w.name}: ${w.message}`);
        }
      }

      if (errors.length > 0) {
        lines.push(`\n## エラー\n${errors.map(e => `- ${e}`).join('\n')}`);
      }

      lines.push(`\n---\n取得時刻: ${new Date().toISOString()}`);
      return txt(lines.join('\n'));
    }
  );

  server.tool('estat_time_series',
    '【e-Stat/SSDS】自治体の時系列データを整列取得。調査周期が異なる指標（5年毎の国勢調査 vs 毎年の財政データ）を±3年フォールバックで整列',
    {
      code: z.string().max(10).describe('市区町村コード（5桁）'),
      indicators: z.array(z.string().max(20)).max(50).describe('SSDS指標コード配列（例: ["A1101","C2108","D2201"]）'),
      yearFrom: z.number().int().min(1900).max(2100).optional().describe('開始年（デフォルト: 2005）'),
      yearTo: z.number().int().min(1900).max(2100).optional().describe('終了年（デフォルト: 2023）'),
    },
    async (p) => {
      const e = need('ESTAT_APP_ID', config.estat.appId); if (e) return txt(e);

      const yearFrom = p.yearFrom ?? 2005;
      const yearTo = p.yearTo ?? 2023;

      // 合併チェック
      const yearRange = Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i);
      const mergerWarn = checkMergerWarning(p.code, yearRange);

      // 各指標でデータ取得
      const yearData: Record<string, Record<number, number | null>> = {};
      const errors: string[] = [];

      for (const ind of p.indicators) {
        yearData[ind] = {};
        const info = getIndicatorInfo(ind);
        const tbl = info?.table;
        if (!tbl) {
          errors.push(`${ind}: テーブルID不明。ssds-registryに未登録。`);
          continue;
        }

        try {
          const res = await estat.getStatsData(config.estat, {
            statsDataId: tbl,
            cdArea: p.code,
            limit: 10000,
          });
          if (res.success && res.data) {
            const dataObj = res.data as any;
            const values = dataObj?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE;
            if (Array.isArray(values)) {
              for (const v of values) {
                const cat = v['@cat01'] || v['@cat02'];
                if (cat === ind) {
                  const timeCode = v['@time'];
                  const year = parseInt(timeCode?.replace(/[^0-9]/g, '').slice(0, 4), 10);
                  if (year >= yearFrom && year <= yearTo) {
                    const val = v['$'];
                    yearData[ind][year] = val === '-' || val === 'x' || val === '***' ? null : (Number.isFinite(parseFloat(val)) ? parseFloat(val) : null);
                  }
                }
              }
            }
          } else {
            errors.push(`${ind}: ${res.error}`);
          }
        } catch (err) {
          errors.push(`${ind}: ${String(err)}`);
        }
      }

      // 時系列整列
      const aligned = alignTimeSeries(yearData, yearRange.filter(y => y % 5 === 0 || y === yearTo));

      // 結果整形
      const lines: string[] = [`# 時系列データ: ${p.code}\n`];

      const header = ['年', ...p.indicators.map(ind => {
        const info = getIndicatorInfo(ind);
        return info ? `${info.label}(${info.unit})` : ind;
      })];
      lines.push(`| ${header.join(' | ')} |`);
      lines.push(`| ${header.map(() => '---').join(' | ')} |`);

      for (const point of aligned) {
        const vals = p.indicators.map(ind => {
          const v = point[ind];
          const actualYear = point[`${ind}_actualYear`];
          if (v === null || v === undefined) return '---';
          const s = typeof v === 'number' ? v.toLocaleString() : String(v);
          return actualYear ? `${s} (${actualYear}年値)` : s;
        });
        lines.push(`| ${point.year} | ${vals.join(' | ')} |`);
      }

      if (mergerWarn) {
        lines.push(`\n## ⚠️ 合併注意\n${mergerWarn.message}`);
      }

      if (errors.length > 0) {
        lines.push(`\n## エラー\n${errors.map(e => `- ${e}`).join('\n')}`);
      }

      lines.push(`\n---\n取得時刻: ${new Date().toISOString()}`);
      return txt(lines.join('\n'));
    }
  );

  server.tool('estat_correlation',
    '【自治体分析】複数自治体データの指標間相関分析。ピアソン相関係数・解釈（強い/中程度/弱い/無相関）を算出。恣意性排除のため全ペアを表示',
    {
      data: z.array(z.object({
        code: z.string().max(10).describe('市区町村コード'),
        name: z.string().max(50).describe('市区町村名'),
      }).catchall(z.union([z.string(), z.number(), z.null()]))).max(200).describe('自治体データ配列（各行に指標値を含む）'),
      metricKeys: z.array(z.string().max(50)).max(20).describe('相関を計算する指標キーの配列（例: ["aging_rate","fiscal_strength_index"]）'),
    },
    async (p) => {
      const results = computeCorrelationMatrix(p.data as MuniDataRow[], p.metricKeys);

      const lines: string[] = ['# 相関分析結果\n'];
      lines.push(`| 指標A | 指標B | r値 | n | 解釈 |`);
      lines.push(`| --- | --- | --- | --- | --- |`);

      for (const r of results) {
        const rStr = r.pearsonR !== null ? r.pearsonR.toFixed(3) : '---';
        const bold = r.pearsonR !== null && Math.abs(r.pearsonR) >= 0.4 ? '**' : '';
        lines.push(`| ${r.metricA} | ${r.metricB} | ${bold}${rStr}${bold} | ${r.n} | ${r.interpretation} |`);
      }

      lines.push(`\n合計ペア数: ${results.length}`);
      lines.push(`|r|≥0.7: ${results.filter(r => r.pearsonR !== null && Math.abs(r.pearsonR) >= 0.7).length}件`);
      lines.push(`|r|≥0.4: ${results.filter(r => r.pearsonR !== null && Math.abs(r.pearsonR) >= 0.4).length}件`);

      return txt(lines.join('\n'));
    }
  );

  server.tool('estat_session_init',
    '【自治体分析】分析セッション初期化。合併チェック・指標利用可能性・推奨コード提案を一括実行するプリフライト。分析前に必ず実行推奨',
    {
      codes: z.array(z.string().max(10)).max(100).describe('分析対象の市区町村コード配列（5桁）'),
      years: z.array(z.number().int().min(1900).max(2100)).max(50).optional().describe('分析対象年リスト（例: [2000,2005,2010,2015,2020]）'),
      requestedMetrics: z.array(z.string().max(50)).max(50).optional().describe('利用したい指標IDリスト（例: ["population","revpar","establishments_accom"]）'),
      granularity: z.enum(['municipality', 'prefecture', 'national']).optional().describe('取得粒度（デフォルト: municipality）'),
    },
    async (p) => {
      const lines: string[] = ['# 📋 分析セッション初期化レポート\n'];
      const gran = p.granularity ?? 'municipality';

      // 1. 合併チェック
      lines.push('## 1. 合併境界チェック');
      const warnings = checkMergerWarnings(p.codes, p.years);
      if (warnings.length === 0) {
        lines.push(`✅ ${p.codes.length}自治体すべて合併境界の問題なし\n`);
      } else {
        for (const w of warnings) {
          lines.push(`⚠️ **${w.name}** (${w.code}): ${w.severity}`);
          lines.push(`   ${w.message}`);
          lines.push(`   構成: ${w.preMergerNames.join(', ')}\n`);
        }
      }

      // 2. 指標利用可能性
      if (p.requestedMetrics && p.requestedMetrics.length > 0) {
        lines.push('## 2. 指標利用可能性チェック');
        const avail = checkMetricsAvailability(p.requestedMetrics, gran);
        if (avail.available.length > 0) {
          lines.push(`\n✅ 利用可能 (${avail.available.length}件):`);
          for (const a of avail.available) {
            lines.push(`- ${a.metric}: ${a.name} (${a.unit}) — ${a.source}`);
            if (a.availableYears) lines.push(`  利用年: ${a.availableYears.join(', ')}`);
          }
        }
        if (avail.unavailable.length > 0) {
          lines.push(`\n❌ 利用不可 (${avail.unavailable.length}件):`);
          for (const u of avail.unavailable) {
            lines.push(`- ${u.metric}: ${u.name} — ${u.reason}`);
            if (u.alternative) lines.push(`  代替: ${u.alternative}`);
          }
        }
      } else {
        lines.push('## 2. 登録済み指標一覧');
        const all = listMetrics(gran);
        lines.push(`${gran}レベルで利用可能: ${all.length}指標`);
        const grouped: Record<string, string[]> = {};
        for (const m of all) {
          const src = m.source.split('（')[0];
          if (!grouped[src]) grouped[src] = [];
          grouped[src].push(`${m.id}(${m.name})`);
        }
        for (const [src, metrics] of Object.entries(grouped)) {
          lines.push(`\n**${src}**: ${metrics.join(', ')}`);
        }
      }

      // 3. 推奨指標コード
      lines.push('\n## 3. SSDS推奨コードガイド');
      const sections = listSections();
      for (const s of sections) {
        lines.push(`- ${s.section}: ${s.label} (${s.count}コード登録)`);
      }
      lines.push('\n💡 legacy指標を使う場合、`estat_browse_indicators`で推奨コードを確認してください。');

      lines.push(`\n---\n初期化時刻: ${new Date().toISOString()}`);
      return txt(lines.join('\n'));
    }
  );
}
