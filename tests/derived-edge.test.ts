/**
 * derived.ts エッジケーステスト
 * - safeDiv/pct/per10k の境界値
 * - computeRankings の同値順位・欠損値処理
 * - computeCorrelation の数学的正確性
 * - computeStandardDerived の全派生指標検証
 * - alignTimeSeries のフォールバックロジック
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

describe('derived edge cases — arithmetic', () => {
  it('safeDiv: 負の値', () => {
    assert.equal(safeDiv(-100, 50), -2);
  });

  it('safeDiv: 小数の精度', () => {
    const result = safeDiv(1, 3);
    assert.ok(result !== null);
    assert.ok(Math.abs(result - 0.33) < 0.01);
  });

  it('safeDiv: multiplier=10000', () => {
    const result = safeDiv(5, 100000, 10000);
    assert.ok(result !== null);
    assert.ok(Math.abs(result - 0.5) < 0.01);
  });

  it('safeDiv: undefined入力', () => {
    assert.equal(safeDiv(undefined, 50), null);
    assert.equal(safeDiv(50, undefined), null);
    assert.equal(safeDiv(undefined, undefined), null);
  });

  it('pct: 100%超え（分子>分母）', () => {
    const result = pct(150, 100);
    assert.equal(result, 150);
  });

  it('pct: 0.1%未満の精度', () => {
    const result = pct(1, 10000);
    assert.ok(result !== null);
    assert.ok(result === 0, `0.01%は0に丸められる: got ${result}`);
  });

  it('per10k: 人口0はnull', () => {
    assert.equal(per10k(100, 0), null);
  });

  it('per10k: 値0は0を返す', () => {
    assert.equal(per10k(0, 50000), 0);
  });

  it('per10k: 大きな値', () => {
    const result = per10k(50000, 100000);
    assert.ok(result !== null);
    assert.equal(result, 5000);
  });
});

describe('derived edge cases — rankings', () => {
  it('同値の場合の順位付け', () => {
    const data: MuniDataRow[] = [
      { code: 'A', name: 'A', value: 100 },
      { code: 'B', name: 'B', value: 100 },
      { code: 'C', name: 'C', value: 50 },
    ];
    const ranks = computeRankings(data, 'value', true);
    // 同値なので1位と2位（安定ソートに依存）
    assert.ok(ranks['A'].rank <= 2);
    assert.ok(ranks['B'].rank <= 2);
    assert.equal(ranks['C'].rank, 3);
    assert.equal(ranks['C'].of, 3);
  });

  it('欠損値（null/undefined/NaN）はランキングから除外', () => {
    const data: MuniDataRow[] = [
      { code: 'A', name: 'A', value: 100 },
      { code: 'B', name: 'B', value: null },
      { code: 'C', name: 'C', value: undefined },
      { code: 'D', name: 'D', value: NaN },
      { code: 'E', name: 'E', value: 50 },
    ];
    const ranks = computeRankings(data, 'value', true);
    assert.equal(Object.keys(ranks).length, 2, '有効値2件のみ');
    assert.equal(ranks['A'].rank, 1);
    assert.equal(ranks['E'].rank, 2);
    assert.equal(ranks['E'].of, 2);
  });

  it('文字列値はランキングから除外', () => {
    const data: MuniDataRow[] = [
      { code: 'A', name: 'A', value: 100 },
      { code: 'B', name: 'B', value: 'x' },
      { code: 'C', name: 'C', value: 50 },
    ];
    const ranks = computeRankings(data, 'value', true);
    assert.equal(Object.keys(ranks).length, 2);
  });

  it('空データ配列は空ランキング', () => {
    const ranks = computeRankings([], 'value', true);
    assert.equal(Object.keys(ranks).length, 0);
  });

  it('存在しないキーは空ランキング', () => {
    const data: MuniDataRow[] = [
      { code: 'A', name: 'A', value: 100 },
    ];
    const ranks = computeRankings(data, 'nonexistent', true);
    assert.equal(Object.keys(ranks).length, 0);
  });
});

describe('derived edge cases — correlation', () => {
  it('無相関データ（直交）', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 1, y: 0 },
      { code: '2', name: 'B', x: 0, y: 1 },
      { code: '3', name: 'C', x: -1, y: 0 },
      { code: '4', name: 'D', x: 0, y: -1 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.ok(result.pearsonR !== null);
    assert.ok(Math.abs(result.pearsonR) < 0.01, `無相関のはず: r=${result.pearsonR}`);
    assert.equal(result.interpretation, 'ほぼ無相関');
  });

  it('全値同一（分散ゼロ）', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 5, y: 5 },
      { code: '2', name: 'B', x: 5, y: 5 },
      { code: '3', name: 'C', x: 5, y: 5 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.equal(result.pearsonR, null);
    assert.ok(result.interpretation.includes('分散ゼロ'));
  });

  it('片方だけ分散ゼロ', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 5, y: 1 },
      { code: '2', name: 'B', x: 5, y: 2 },
      { code: '3', name: 'C', x: 5, y: 3 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.equal(result.pearsonR, null);
  });

  it('欠損値を含むペア: 有効ペアのみで計算', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 1, y: 2 },
      { code: '2', name: 'B', x: 2, y: null },
      { code: '3', name: 'C', x: 3, y: 6 },
      { code: '4', name: 'D', x: null, y: 8 },
      { code: '5', name: 'E', x: 5, y: 10 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.equal(result.n, 3, '有効ペア3件');
    assert.ok(result.pearsonR !== null);
    assert.equal(result.pearsonR, 1, '有効3ペアは完全正相関');
  });

  it('n=3（最小有効数）で計算可能', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', x: 1, y: 10 },
      { code: '2', name: 'B', x: 2, y: 20 },
      { code: '3', name: 'C', x: 3, y: 30 },
    ];
    const result = computeCorrelation(data, 'x', 'y');
    assert.ok(result.pearsonR !== null);
    assert.equal(result.n, 3);
  });

  it('相関の解釈閾値テスト', () => {
    const strongData: MuniDataRow[] = [
      { code: '1', name: 'A', x: 1, y: 2 },
      { code: '2', name: 'B', x: 2, y: 4.1 },
      { code: '3', name: 'C', x: 3, y: 5.9 },
      { code: '4', name: 'D', x: 4, y: 8.05 },
      { code: '5', name: 'E', x: 5, y: 10 },
    ];
    const result = computeCorrelation(strongData, 'x', 'y');
    assert.ok(result.pearsonR !== null && result.pearsonR > 0.9);
    assert.equal(result.interpretation, '強い相関');
  });

  it('computeCorrelationMatrix: |r|降順ソート確認', () => {
    const data: MuniDataRow[] = [
      { code: '1', name: 'A', a: 1, b: 2, c: 10, d: 5 },
      { code: '2', name: 'B', a: 2, b: 4, c: 8, d: 3 },
      { code: '3', name: 'C', a: 3, b: 6, c: 6, d: 7 },
      { code: '4', name: 'D', a: 4, b: 8, c: 4, d: 1 },
    ];
    const results = computeCorrelationMatrix(data, ['a', 'b', 'c', 'd']);
    assert.equal(results.length, 6);
    for (let i = 1; i < results.length; i++) {
      assert.ok(
        Math.abs(results[i - 1].pearsonR ?? 0) >= Math.abs(results[i].pearsonR ?? 0),
        `ソート違反: ${results[i - 1].pearsonR} < ${results[i].pearsonR}`
      );
    }
  });

  it('computeCorrelationMatrix: 指標1つは0ペア', () => {
    const data: MuniDataRow[] = [{ code: '1', name: 'A', x: 1 }];
    const results = computeCorrelationMatrix(data, ['x']);
    assert.equal(results.length, 0);
  });
});

describe('derived edge cases — computeStandardDerived', () => {
  it('全フィールド欠損の行', () => {
    const data: MuniDataRow[] = [
      { code: '99999', name: 'テスト市' },
    ];
    const result = computeStandardDerived(data);
    assert.equal(result.perMunicipality.length, 1);
    const d = result.perMunicipality[0];
    assert.equal(d.aging_rate, null);
    assert.equal(d.accom_share_est, null);
    assert.equal(d.accom_share_emp, null);
    assert.equal(d.emp_per_est_accom, null);
    assert.equal(d.sales_per_est_accom, null);
    assert.equal(d.sales_per_emp_accom, null);
    assert.equal(d.va_per_emp_accom, null);
    assert.equal(d.accom_est_per_10k, null);
    assert.equal(d.accom_emp_per_10k, null);
  });

  it('0人口の行', () => {
    const data: MuniDataRow[] = [
      { code: '00000', name: 'ゼロ市', population: 0, population_65plus: 0 },
    ];
    const result = computeStandardDerived(data);
    const d = result.perMunicipality[0];
    assert.equal(d.aging_rate, null, '0除算はnull');
    assert.equal(d.accom_est_per_10k, null);
  });

  it('ランキングが生成される', () => {
    const data: MuniDataRow[] = [
      { code: 'A', name: 'A市', population: 100000, population_65plus: 30000,
        establishments_all: 5000, establishments_accom: 500,
        employees_all: 50000, employees_accom: 5000,
        sales_accom: 10000, value_added_accom: 3000, fiscal_strength_index: 0.8 },
      { code: 'B', name: 'B市', population: 50000, population_65plus: 20000,
        establishments_all: 2000, establishments_accom: 300,
        employees_all: 20000, employees_accom: 3000,
        sales_accom: 5000, value_added_accom: 1000, fiscal_strength_index: 0.4 },
    ];
    const result = computeStandardDerived(data);
    assert.ok(Object.keys(result.rankings).length > 0, 'ランキングが存在');
    const accomRank = result.rankings['accom_est_per_10k'];
    if (accomRank) {
      assert.ok(accomRank['A'] || accomRank['B'], 'ランキングにデータがある');
    }
  });
});

describe('derived edge cases — alignTimeSeries', () => {
  it('フォールバック方向: 先に過去を探す', () => {
    const yearData = {
      metric: { 2018: 100, 2022: 200 } as Record<number, number | null>,
    };
    const aligned = alignTimeSeries(yearData, [2020]);
    assert.equal(aligned[0].metric, 100);
    assert.equal(aligned[0]['metric_actualYear'], 2018);
  });

  it('フォールバック: 過去より未来が近い場合は未来を使う', () => {
    const yearData = {
      metric: { 2017: 100, 2022: 200 } as Record<number, number | null>,
    };
    // 2020を要求→delta=1: 2019/2021なし→delta=2: 2018なし/2022あり（+2年）
    const aligned = alignTimeSeries(yearData, [2020]);
    assert.equal(aligned[0].metric, 200, '2022(delta=2)は2017(delta=3)より近い');
    assert.equal(aligned[0]['metric_actualYear'], 2022);
  });

  it('複数指標の整列', () => {
    const yearData = {
      pop: { 2015: 30000, 2020: 28000 } as Record<number, number | null>,
      est: { 2014: 1600, 2016: 1550, 2021: 1500 } as Record<number, number | null>,
      fsi: { 2015: 0.3, 2016: 0.29, 2017: 0.28, 2018: 0.27, 2019: 0.26, 2020: 0.25 } as Record<number, number | null>,
    };
    const aligned = alignTimeSeries(yearData, [2015, 2020]);
    assert.equal(aligned.length, 2);

    assert.equal(aligned[0].pop, 30000);
    assert.equal(aligned[0].est, 1600);
    assert.equal(aligned[0].fsi, 0.3);

    assert.equal(aligned[1].pop, 28000);
    assert.equal(aligned[1].est, 1500);
    assert.equal(aligned[1].fsi, 0.25);
  });

  it('targetYears省略時は全年を使用', () => {
    const yearData = {
      a: { 2018: 1, 2020: 2 } as Record<number, number | null>,
      b: { 2019: 10, 2021: 20 } as Record<number, number | null>,
    };
    const aligned = alignTimeSeries(yearData);
    assert.equal(aligned.length, 4);
    assert.equal(aligned[0].year, 2018);
    assert.equal(aligned[3].year, 2021);
  });

  it('空のyearDataは空結果', () => {
    const aligned = alignTimeSeries({}, [2020]);
    assert.equal(aligned.length, 1);
    assert.equal(aligned[0].year, 2020);
  });

  it('nullデータポイントはそのまま保持', () => {
    const yearData = {
      metric: { 2020: null } as Record<number, number | null>,
    };
    const aligned = alignTimeSeries(yearData, [2020]);
    assert.equal(aligned[0].metric, null);
  });
});
