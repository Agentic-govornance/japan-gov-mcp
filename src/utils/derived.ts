/**
 * 派生指標計算・統計分析モジュール
 *
 * 自治体比較分析で必要な計算機能を提供:
 * - 人口あたり率、構成比
 * - ランキング
 * - ピアソン相関
 * - 時系列整列
 */

// ── 型定義 ──

export interface MuniDataRow {
  code: string;
  name: string;
  [key: string]: string | number | null | undefined;
}

export interface RankEntry {
  rank: number;
  of: number;
}

export interface CorrelationResult {
  metricA: string;
  metricB: string;
  pearsonR: number | null;
  n: number;
  interpretation: string;
}

export interface DerivedMetricsResult {
  perMunicipality: DerivedMuniRow[];
  rankings: Record<string, Record<string, RankEntry>>;
}

export interface DerivedMuniRow extends MuniDataRow {
  [key: string]: string | number | null | undefined;
}

export interface TimeSeriesPoint {
  year: number;
  [metric: string]: number | null | undefined;
}

// ── 基本計算 ──

/**
 * 安全な割り算
 */
export function safeDiv(a: number | null | undefined, b: number | null | undefined, multiplier = 1): number | null {
  if (a == null || b == null || b === 0) return null;
  return Math.round((a / b) * multiplier * 100) / 100;
}

/**
 * パーセント計算
 */
export function pct(part: number | null | undefined, whole: number | null | undefined): number | null {
  if (part == null || whole == null || whole === 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * 人口1万人あたりの値
 */
export function per10k(value: number | null | undefined, population: number | null | undefined): number | null {
  return safeDiv(value, population, 10000);
}

// ── ランキング ──

/**
 * データ配列にランキングを付与
 * @returns code -> RankEntry のマッピング
 */
export function computeRankings(
  data: MuniDataRow[],
  key: string,
  higherIsBetter = true,
): Record<string, RankEntry> {
  const valid: { code: string; value: number }[] = [];
  for (const row of data) {
    const v = row[key];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      valid.push({ code: row.code, value: v });
    }
  }

  valid.sort((a, b) => higherIsBetter ? b.value - a.value : a.value - b.value);

  const result: Record<string, RankEntry> = {};
  for (let i = 0; i < valid.length; i++) {
    result[valid[i].code] = { rank: i + 1, of: valid.length };
  }
  return result;
}

// ── 相関分析 ──

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdev(arr: number[], avg: number): number {
  const sumSq = arr.reduce((s, v) => s + (v - avg) ** 2, 0);
  return Math.sqrt(sumSq / (arr.length - 1));
}

/**
 * 2指標のピアソン相関係数
 */
export function computeCorrelation(
  data: MuniDataRow[],
  keyA: string,
  keyB: string,
): CorrelationResult {
  const pairs: [number, number][] = [];
  for (const row of data) {
    const a = row[keyA];
    const b = row[keyB];
    if (typeof a === 'number' && typeof b === 'number' && !Number.isNaN(a) && !Number.isNaN(b)) {
      pairs.push([a, b]);
    }
  }

  if (pairs.length < 3) {
    return { metricA: keyA, metricB: keyB, pearsonR: null, n: pairs.length, interpretation: 'データ不足（n<3）' };
  }

  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const sx = stdev(xs, mx);
  const sy = stdev(ys, my);

  if (sx === 0 || sy === 0) {
    return { metricA: keyA, metricB: keyB, pearsonR: null, n: pairs.length, interpretation: '分散ゼロ' };
  }

  const cov = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / (pairs.length - 1);
  const r = Math.round((cov / (sx * sy)) * 1000) / 1000;

  let interpretation: string;
  const absR = Math.abs(r);
  if (absR >= 0.7) interpretation = '強い相関';
  else if (absR >= 0.4) interpretation = '中程度の相関';
  else if (absR >= 0.2) interpretation = '弱い相関';
  else interpretation = 'ほぼ無相関';

  return { metricA: keyA, metricB: keyB, pearsonR: r, n: pairs.length, interpretation };
}

/**
 * 全指標ペアの相関行列を計算
 */
export function computeCorrelationMatrix(
  data: MuniDataRow[],
  metricKeys: string[],
): CorrelationResult[] {
  const results: CorrelationResult[] = [];
  for (let i = 0; i < metricKeys.length; i++) {
    for (let j = i + 1; j < metricKeys.length; j++) {
      results.push(computeCorrelation(data, metricKeys[i], metricKeys[j]));
    }
  }
  // |r| 降順でソート
  results.sort((a, b) => Math.abs(b.pearsonR ?? 0) - Math.abs(a.pearsonR ?? 0));
  return results;
}

// ── 派生指標の一括計算 ──

/**
 * 標準的な派生指標を一括計算
 */
export function computeStandardDerived(data: MuniDataRow[]): DerivedMetricsResult {
  const perMunicipality: DerivedMuniRow[] = data.map(row => {
    const d: DerivedMuniRow = { ...row };

    const pop = typeof row.population === 'number' ? row.population : null;
    const pop65 = typeof row.population_65plus === 'number' ? row.population_65plus : null;
    const estAll = typeof row.establishments_all === 'number' ? row.establishments_all : null;
    const estAccom = typeof row.establishments_accom === 'number' ? row.establishments_accom : null;
    const empAll = typeof row.employees_all === 'number' ? row.employees_all : null;
    const empAccom = typeof row.employees_accom === 'number' ? row.employees_accom : null;
    const salesAccom = typeof row.sales_accom === 'number' ? row.sales_accom : null;
    const vaAccom = typeof row.value_added_accom === 'number' ? row.value_added_accom : null;

    d.aging_rate = pct(pop65, pop);
    d.accom_share_est = pct(estAccom, estAll);
    d.accom_share_emp = pct(empAccom, empAll);
    d.emp_per_est_accom = safeDiv(empAccom, estAccom);
    d.sales_per_est_accom = safeDiv(salesAccom, estAccom);
    d.sales_per_emp_accom = safeDiv(salesAccom, empAccom);
    d.va_per_emp_accom = safeDiv(vaAccom, empAccom);
    d.accom_est_per_10k = per10k(estAccom, pop);
    d.accom_emp_per_10k = per10k(empAccom, pop);

    return d;
  });

  // ランキング計算
  const rankMetrics = [
    { key: 'accom_est_per_10k', higherIsBetter: true },
    { key: 'accom_emp_per_10k', higherIsBetter: true },
    { key: 'sales_per_emp_accom', higherIsBetter: true },
    { key: 'va_per_emp_accom', higherIsBetter: true },
    { key: 'accom_share_emp', higherIsBetter: true },
    { key: 'fiscal_strength_index', higherIsBetter: true },
    { key: 'aging_rate', higherIsBetter: false },
  ];

  const rankings: Record<string, Record<string, RankEntry>> = {};
  for (const { key, higherIsBetter } of rankMetrics) {
    rankings[key] = computeRankings(perMunicipality, key, higherIsBetter);
  }

  return { perMunicipality, rankings };
}

// ── 時系列整列 ──

/**
 * 異なる指標の年次データを最近年で整列
 */
export function alignTimeSeries(
  yearData: Record<string, Record<number, number | null>>,
  targetYears?: number[],
): TimeSeriesPoint[] {
  // 全年を収集
  const allYears = new Set<number>();
  for (const data of Object.values(yearData)) {
    for (const year of Object.keys(data)) {
      allYears.add(parseInt(year, 10));
    }
  }

  const years = targetYears ?? Array.from(allYears).sort((a, b) => a - b);
  const metrics = Object.keys(yearData);

  return years.map(year => {
    const point: TimeSeriesPoint = { year };
    for (const metric of metrics) {
      const data = yearData[metric];
      // 当該年のデータがあればそのまま使用
      if (data[year] !== undefined) {
        point[metric] = data[year];
      } else {
        // 最近年にフォールバック（±3年以内）
        let found = false;
        for (let delta = 1; delta <= 3; delta++) {
          if (data[year - delta] !== undefined) {
            point[metric] = data[year - delta];
            point[`${metric}_actualYear`] = year - delta;
            found = true;
            break;
          }
          if (data[year + delta] !== undefined) {
            point[metric] = data[year + delta];
            point[`${metric}_actualYear`] = year + delta;
            found = true;
            break;
          }
        }
        if (!found) point[metric] = null;
      }
    }
    return point;
  });
}
