/**
 * 自治体分析ユーティリティ テスト
 *
 * ssds-registry, metric-scope, merger, derived の4モジュールを検証。
 * 全てオフラインで動作（API呼び出しなし）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── ssds-registry ──

import {
  browseIndicators,
  getIndicatorInfo,
  getIndicatorUnit,
  getRelatedIndicators,
  getRecommendedCode,
  getTableIndicators,
  listSections,
} from '../build/utils/ssds-registry.js';

describe('ssds-registry', () => {
  it('browseIndicators: テーブルIDで絞込', () => {
    const results = browseIndicators({ tableId: '0000020101' });
    assert.ok(results.length >= 5, `人口テーブルは5指標以上: got ${results.length}`);
    assert.ok(results.every(r => r.table === '0000020101'));
  });

  it('browseIndicators: セクションで絞込', () => {
    const results = browseIndicators({ section: 'C' });
    assert.ok(results.length >= 5);
    assert.ok(results.every(r => r.section === 'C'));
  });

  it('browseIndicators: キーワード検索', () => {
    const results = browseIndicators({ keyword: '事業所' });
    assert.ok(results.length >= 2);
    assert.ok(results.some(r => r.code === 'C2108'));
  });

  it('browseIndicators: recommendedOnlyフィルタ', () => {
    const all = browseIndicators({ section: 'C' });
    const recommended = browseIndicators({ section: 'C', recommendedOnly: true });
    assert.ok(recommended.length < all.length, 'legacy/alternative除外');
    assert.ok(recommended.every(r => r.recommendation === 'preferred'));
  });

  it('getIndicatorInfo: 有効なコード', () => {
    const info = getIndicatorInfo('A1101');
    assert.ok(info);
    assert.equal(info.label, '総人口');
    assert.equal(info.unit, '人');
    assert.equal(info.section, 'A');
  });

  it('getIndicatorInfo: 無効なコードはnull', () => {
    assert.equal(getIndicatorInfo('ZZZZZ'), null);
  });

  it('getIndicatorUnit: 単位取得', () => {
    assert.equal(getIndicatorUnit('D2201'), '指数');
    assert.equal(getIndicatorUnit('C2108'), '事業所');
    assert.equal(getIndicatorUnit('INVALID'), null);
  });

  it('getRelatedIndicators: C2107→C2108の関連検出', () => {
    const related = getRelatedIndicators('C2107');
    assert.ok(related.length >= 1);
    assert.ok(related.some(r => r.code === 'C2108'));
  });

  it('getRecommendedCode: legacy→preferredを提案', () => {
    const rec = getRecommendedCode('C2107');
    assert.ok(rec);
    assert.equal(rec.code, 'C2108');
    assert.equal(rec.recommendation, 'preferred');
  });

  it('getRecommendedCode: preferredはそのまま返す', () => {
    const rec = getRecommendedCode('A1101');
    assert.ok(rec);
    assert.equal(rec.code, 'A1101');
  });

  it('getTableIndicators: テーブルの全指標', () => {
    const inds = getTableIndicators('0000020103');
    assert.ok(inds.length >= 8, `経済テーブルは8指標以上: got ${inds.length}`);
  });

  it('listSections: 全セクション一覧', () => {
    const sections = listSections();
    assert.ok(sections.length >= 3, 'A, C, Dの3セクション以上');
    assert.ok(sections.some(s => s.section === 'A' && s.label === '人口・世帯'));
    assert.ok(sections.some(s => s.section === 'C' && s.label === '経済基盤'));
    assert.ok(sections.some(s => s.section === 'D' && s.label === '行政基盤'));
  });
});

// ── metric-scope ──

import {
  checkMetricsAvailability,
  getMetricUnit,
  getMetricDefinition,
  getUnitBySsdsCode,
  listMetrics,
  listMetricIds,
} from '../build/utils/metric-scope.js';

describe('metric-scope', () => {
  it('checkMetricsAvailability: 市区町村レベルで利用可能', () => {
    const result = checkMetricsAvailability(['population', 'fiscal_strength_index'], 'municipality');
    assert.equal(result.available.length, 2);
    assert.equal(result.unavailable.length, 0);
  });

  it('checkMetricsAvailability: RevPARは市区町村不可', () => {
    const result = checkMetricsAvailability(['revpar', 'population'], 'municipality');
    assert.equal(result.available.length, 1);
    assert.equal(result.unavailable.length, 1);
    assert.equal(result.unavailable[0].metric, 'revpar');
    assert.ok(result.unavailable[0].alternative);
  });

  it('checkMetricsAvailability: RevPARは都道府県で利用可能', () => {
    const result = checkMetricsAvailability(['revpar'], 'prefecture');
    assert.equal(result.available.length, 1);
  });

  it('checkMetricsAvailability: 未登録指標', () => {
    const result = checkMetricsAvailability(['nonexistent_metric']);
    assert.equal(result.unavailable.length, 1);
    assert.ok(result.unavailable[0].reason.includes('登録されていません'));
  });

  it('getMetricUnit: 正常系', () => {
    assert.equal(getMetricUnit('population'), '人');
    assert.equal(getMetricUnit('fiscal_strength_index'), '指数');
    assert.equal(getMetricUnit('invalid'), null);
  });

  it('getMetricDefinition: 詳細取得', () => {
    const def = getMetricDefinition('establishments_accom');
    assert.ok(def);
    assert.equal(def.name, '事業所数（宿泊飲食サービス業）');
    assert.equal(def.minGranularity, 'municipality');
    assert.ok(def.ssdsCodes?.includes('C210847'));
  });

  it('getUnitBySsdsCode: SSDSコードから単位', () => {
    assert.equal(getUnitBySsdsCode('A1101'), '人');
    assert.equal(getUnitBySsdsCode('D2201'), '指数');
    assert.equal(getUnitBySsdsCode('ZZZZZ'), null);
  });

  it('listMetrics: 全指標一覧', () => {
    const all = listMetrics();
    assert.ok(all.length >= 15, `15指標以上: got ${all.length}`);
  });

  it('listMetrics: 粒度フィルタ', () => {
    const muni = listMetrics('municipality');
    const pref = listMetrics('prefecture');
    const nat = listMetrics('national');
    assert.ok(pref.length >= muni.length, '都道府県は市区町村以上');
    assert.ok(nat.length >= pref.length, '全国は都道府県以上');
  });

  it('listMetricIds: ID一覧', () => {
    const ids = listMetricIds();
    assert.ok(ids.includes('population'));
    assert.ok(ids.includes('revpar'));
  });
});

// ── merger ──

import {
  getMergerInfo,
  checkMergerWarning,
  checkMergerWarnings,
  listMergers,
} from '../build/utils/merger.js';

describe('merger', () => {
  it('getMergerInfo: 長門市(35211)の合併情報', () => {
    const info = getMergerInfo('35211');
    assert.ok(info);
    assert.equal(info.name, '長門市');
    assert.equal(info.mergerDate, '2005-03-22');
    assert.ok(info.preMergerEntities.length >= 4);
    assert.equal(info.type, 'new');
  });

  it('getMergerInfo: 6桁コードでもヒット', () => {
    const info = getMergerInfo('352110');
    assert.ok(info);
    assert.equal(info.name, '長門市');
  });

  it('getMergerInfo: 合併なし自治体はnull', () => {
    // 草津町は合併なし
    assert.equal(getMergerInfo('10426'), null);
  });

  it('checkMergerWarning: 境界を跨ぐ場合はHIGH', () => {
    const warn = checkMergerWarning('35211', [2000, 2005, 2010, 2015, 2020]);
    assert.ok(warn);
    assert.equal(warn.severity, 'HIGH');
    assert.ok(warn.affectedYears.before.includes(2000));
    assert.ok(warn.affectedYears.after.includes(2010));
  });

  it('checkMergerWarning: 境界を跨がない場合はnull', () => {
    const warn = checkMergerWarning('35211', [2010, 2015, 2020]);
    assert.equal(warn, null, '2005合併後のみなので問題なし');
  });

  it('checkMergerWarning: 年リストなしの場合はMEDIUM', () => {
    const warn = checkMergerWarning('35211');
    assert.ok(warn);
    assert.equal(warn.severity, 'MEDIUM');
  });

  it('checkMergerWarnings: 複数コード一括チェック', () => {
    const warnings = checkMergerWarnings(
      ['35211', '14382', '10426', '44213'],
      [2000, 2010, 2020]
    );
    // 長門市と由布市は合併あり&境界跨ぎ、箱根町と草津町は合併なし
    assert.ok(warnings.length >= 2, `少なくとも2件: got ${warnings.length}`);
    assert.ok(warnings.some(w => w.code === '35211')); // 長門市
    assert.ok(warnings.some(w => w.code === '44213')); // 由布市
  });

  it('listMergers: 全合併リスト', () => {
    const all = listMergers();
    assert.ok(all.length >= 15, `15件以上: got ${all.length}`);
  });

  it('豊岡市: 城崎温泉の合併', () => {
    const info = getMergerInfo('28209');
    assert.ok(info);
    assert.equal(info.name, '豊岡市');
    assert.ok(info.preMergerEntities.some(e => e.name === '城崎町'));
  });
});

// ── derived ──

import {
  safeDiv,
  pct,
  per10k,
  computeRankings,
  computeCorrelation,
  computeCorrelationMatrix,
  computeStandardDerived,
  alignTimeSeries,
} from '../build/utils/derived.js';
import type { MuniDataRow } from '../build/utils/derived.js';

describe('derived', () => {
  it('safeDiv: 正常な割り算', () => {
    assert.equal(safeDiv(100, 50), 2);
    assert.equal(safeDiv(100, 50, 100), 200);
  });

  it('safeDiv: ゼロ除算はnull', () => {
    assert.equal(safeDiv(100, 0), null);
    assert.equal(safeDiv(null, 50), null);
    assert.equal(safeDiv(100, null), null);
  });

  it('pct: パーセント計算', () => {
    assert.equal(pct(25, 100), 25);
    assert.equal(pct(1, 3), 33.3);
  });

  it('pct: ゼロ除算はnull', () => {
    assert.equal(pct(25, 0), null);
    assert.equal(pct(null, 100), null);
  });

  it('per10k: 人口1万人あたり', () => {
    const result = per10k(500, 30000);
    assert.ok(result !== null);
    assert.ok(Math.abs(result - 166.67) < 0.1, `≈166.67: got ${result}`);
  });

  it('computeRankings: 降順ランキング', () => {
    const data: MuniDataRow[] = [
      { code: 'A', name: 'CityA', value: 100 },
      { code: 'B', name: 'CityB', value: 300 },
      { code: 'C', name: 'CityC', value: 200 },
    ];
    const ranks = computeRankings(data, 'value', true);
    assert.equal(ranks['B'].rank, 1);
    assert.equal(ranks['C'].rank, 2);
    assert.equal(ranks['A'].rank, 3);
    assert.equal(ranks['A'].of, 3);
  });

  it('computeRankings: 昇順ランキング', () => {
    const data: MuniDataRow[] = [
      { code: 'A', name: 'CityA', value: 100 },
      { code: 'B', name: 'CityB', value: 300 },
    ];
    const ranks = computeRankings(data, 'value', false);
    assert.equal(ranks['A'].rank, 1, '小さい方が上位');
  });

  it('computeCorrelation: 正の完全相関', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 1, y: 2 },
      { code: '2', name: 'B', x: 2, y: 4 },
      { code: '3', name: 'C', x: 3, y: 6 },
      { code: '4', name: 'D', x: 4, y: 8 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.equal(result.pearsonR, 1);
    assert.equal(result.n, 4);
    assert.equal(result.interpretation, '強い相関');
  });

  it('computeCorrelation: 負の完全相関', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 1, y: 8 },
      { code: '2', name: 'B', x: 2, y: 6 },
      { code: '3', name: 'C', x: 3, y: 4 },
      { code: '4', name: 'D', x: 4, y: 2 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.equal(result.pearsonR, -1);
  });

  it('computeCorrelation: データ不足(n<3)はnull', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 1, y: 2 },
      { code: '2', name: 'B', x: 2, y: 4 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.equal(result.pearsonR, null);
    assert.ok(result.interpretation.includes('データ不足'));
  });

  it('computeCorrelationMatrix: 全ペア計算', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', a: 1, b: 2, c: 3 },
      { code: '2', name: 'B', a: 2, b: 4, c: 1 },
      { code: '3', name: 'C', a: 3, b: 6, c: 2 },
      { code: '4', name: 'D', a: 4, b: 8, c: 4 },
    ];
    const results = computeCorrelationMatrix(data, ['a', 'b', 'c']);
    // 3指標なので3C2=3ペア
    assert.equal(results.length, 3);
    // |r|降順ソート
    assert.ok(Math.abs(results[0].pearsonR ?? 0) >= Math.abs(results[results.length - 1].pearsonR ?? 0));
  });

  it('computeStandardDerived: 派生指標計算', () => {
    const data: MuniDataRow[] = [
      {
        code: '35211', name: '長門市',
        population: 32000, population_65plus: 12800,
        establishments_all: 1560, establishments_accom: 350,
        employees_all: 10000, employees_accom: 2000,
        sales_accom: 5000, value_added_accom: 1500,
      },
    ];
    const result = computeStandardDerived(data);
    assert.equal(result.perMunicipality.length, 1);

    const d = result.perMunicipality[0];
    assert.equal(d.aging_rate, 40, '高齢化率 = 12800/32000 * 100 = 40%');
    assert.ok(d.accom_share_est !== null);
    assert.ok(d.accom_share_emp !== null);
  });

  it('alignTimeSeries: 時系列整列', () => {
    const yearData = {
      population: { 2010: 35000, 2015: 32000, 2020: 30000 } as Record<number, number | null>,
      fiscal: { 2011: 0.3, 2013: 0.28, 2015: 0.25 } as Record<number, number | null>,
    };
    const aligned = alignTimeSeries(yearData, [2010, 2015, 2020]);
    assert.equal(aligned.length, 3);

    // 2010: population=35000, fiscal→2011にフォールバック
    assert.equal(aligned[0].year, 2010);
    assert.equal(aligned[0].population, 35000);
    assert.equal(aligned[0].fiscal, 0.3); // 2011のデータ

    // 2015: 両方直接データあり
    assert.equal(aligned[1].population, 32000);
    assert.equal(aligned[1].fiscal, 0.25);

    // 2020: population=30000, fiscal→範囲外でnull or ±3年以内にない
    assert.equal(aligned[2].population, 30000);
  });

  it('alignTimeSeries: ±3年範囲外はnull', () => {
    const yearData = {
      sparse: { 2010: 100 } as Record<number, number | null>,
    };
    const aligned = alignTimeSeries(yearData, [2020]);
    // 2020から±3年以内に2010はないのでnull
    assert.equal(aligned[0].sparse, null);
  });
});
