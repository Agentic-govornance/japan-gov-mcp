/**
 * 指標利用可能性レジストリ
 *
 * SSDS指標の粒度（市区町村/都道府県/全国）、単位、利用可能年を管理し、
 * ユーザーが取得不可能なデータを事前に検知する。
 */

// ── 型定義 ──

export type Granularity = 'municipality' | 'prefecture' | 'national';

export interface MetricDefinition {
  /** 指標識別子（内部キー） */
  id: string;
  /** 表示名 */
  name: string;
  /** 単位 */
  unit: string;
  /** 利用可能な最小粒度 */
  minGranularity: Granularity;
  /** データソース */
  source: string;
  /** SSDS テーブルID（あれば） */
  ssdsTable?: string;
  /** SSDS 指標コード（あれば） */
  ssdsCodes?: string[];
  /** データ利用可能年 */
  availableYears?: number[];
  /** 原統計の調査周期 */
  surveyCycle?: string;
  /** 取得不可の場合の理由 */
  unavailableReason?: string;
  /** 代替手段 */
  alternative?: string;
}

export interface AvailabilityResult {
  available: {
    metric: string;
    name: string;
    unit: string;
    source: string;
    availableYears?: number[];
    surveyCycle?: string;
  }[];
  unavailable: {
    metric: string;
    name: string;
    reason: string;
    alternative?: string;
    availableAt?: Granularity;
  }[];
}

// ── 指標レジストリ ──

const GRANULARITY_RANK: Record<Granularity, number> = {
  municipality: 0,
  prefecture: 1,
  national: 2,
};

const METRICS: MetricDefinition[] = [
  // ── A 人口・世帯（国勢調査） ──
  { id: 'population', name: '総人口', unit: '人', minGranularity: 'municipality',
    source: '国勢調査', ssdsTable: '0000020101', ssdsCodes: ['A1101'],
    availableYears: [2000, 2005, 2010, 2015, 2020], surveyCycle: '5年' },
  { id: 'population_65plus', name: '65歳以上人口', unit: '人', minGranularity: 'municipality',
    source: '国勢調査', ssdsTable: '0000020101', ssdsCodes: ['A1303'],
    availableYears: [2000, 2005, 2010, 2015, 2020], surveyCycle: '5年' },
  { id: 'households', name: '世帯数', unit: '世帯', minGranularity: 'municipality',
    source: '国勢調査', ssdsTable: '0000020101', ssdsCodes: ['A7101'],
    availableYears: [2000, 2005, 2010, 2015, 2020], surveyCycle: '5年' },

  // ── C 経済基盤（経済センサス） ──
  { id: 'establishments_all', name: '事業所数（民営全産業）', unit: '事業所', minGranularity: 'municipality',
    source: '経済センサス', ssdsTable: '0000020103', ssdsCodes: ['C2108'],
    availableYears: [2009, 2011, 2014, 2016, 2021], surveyCycle: '約5年' },
  { id: 'employees_all', name: '従業者数（民営全産業）', unit: '人', minGranularity: 'municipality',
    source: '経済センサス', ssdsTable: '0000020103', ssdsCodes: ['C2208'],
    availableYears: [2009, 2011, 2014, 2016, 2021], surveyCycle: '約5年' },
  { id: 'establishments_accom', name: '事業所数（宿泊飲食サービス業）', unit: '事業所', minGranularity: 'municipality',
    source: '経済センサス', ssdsTable: '0000020103', ssdsCodes: ['C210847'],
    availableYears: [2011, 2014, 2016, 2021], surveyCycle: '約5年' },
  { id: 'employees_accom', name: '従業者数（宿泊飲食サービス業）', unit: '人', minGranularity: 'municipality',
    source: '経済センサス', ssdsTable: '0000020103', ssdsCodes: ['C220847'],
    availableYears: [2011, 2014, 2016, 2021], surveyCycle: '約5年' },
  { id: 'sales_accom', name: '売上金額（宿泊飲食サービス業）', unit: '百万円', minGranularity: 'municipality',
    source: '経済センサス', ssdsTable: '0000020103', ssdsCodes: ['C610117'],
    availableYears: [2011, 2013, 2015, 2020], surveyCycle: '約5年' },
  { id: 'value_added_accom', name: '付加価値額（宿泊飲食サービス業）', unit: '百万円', minGranularity: 'municipality',
    source: '経済センサス', ssdsTable: '0000020103', ssdsCodes: ['C620117'],
    availableYears: [2011, 2015, 2020], surveyCycle: '約5年' },

  // ── D 行政基盤（地方財政状況調査） ──
  { id: 'fiscal_strength_index', name: '財政力指数', unit: '指数', minGranularity: 'municipality',
    source: '地方財政状況調査', ssdsTable: '0000020104', ssdsCodes: ['D2201'],
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i), surveyCycle: '毎年' },
  { id: 'ordinary_balance_ratio', name: '経常収支比率', unit: '%', minGranularity: 'municipality',
    source: '地方財政状況調査', ssdsTable: '0000020104', ssdsCodes: ['D2203'],
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i), surveyCycle: '毎年' },
  { id: 'local_tax', name: '地方税', unit: '千円', minGranularity: 'municipality',
    source: '地方財政状況調査', ssdsTable: '0000020104', ssdsCodes: ['D320101'],
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i), surveyCycle: '毎年' },
  { id: 'commerce_expenditure', name: '商工費', unit: '千円', minGranularity: 'municipality',
    source: '地方財政状況調査', ssdsTable: '0000020104', ssdsCodes: ['D320307'],
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i), surveyCycle: '毎年' },
  { id: 'total_expenditure', name: '歳出決算総額', unit: '千円', minGranularity: 'municipality',
    source: '地方財政状況調査', ssdsTable: '0000020104', ssdsCodes: ['D3203'],
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i), surveyCycle: '毎年' },

  // ── 宿泊旅行統計（都道府県レベルのみ） ──
  { id: 'revpar', name: 'RevPAR', unit: '円', minGranularity: 'prefecture',
    source: '観光庁宿泊旅行統計', surveyCycle: '毎月',
    unavailableReason: '市区町村レベルでは公表されていない。都道府県単位のみ。',
    alternative: '都道府県データを参考値として利用' },
  { id: 'occupancy_rate', name: '客室稼働率', unit: '%', minGranularity: 'prefecture',
    source: '観光庁宿泊旅行統計', surveyCycle: '毎月',
    unavailableReason: '市区町村レベルでは公表されていない。都道府県単位のみ。',
    alternative: '都道府県データを参考値として利用' },
  { id: 'guest_nights', name: '延べ宿泊者数', unit: '人泊', minGranularity: 'prefecture',
    source: '観光庁宿泊旅行統計', surveyCycle: '毎月',
    unavailableReason: '市区町村レベルでは公表されていない。',
    alternative: '都道府県データを参考値として利用' },

  // ── 取得不可指標 ──
  { id: 'nyuto_tax', name: '入湯税収入', unit: '千円', minGranularity: 'municipality',
    source: '総務省地方財政個別調査',
    unavailableReason: 'PDF非構造化データのみ。API経由で取得不可。',
    alternative: '総務省HPの個別調査PDF参照' },
  { id: 'effective_job_ratio', name: '有効求人倍率', unit: '倍', minGranularity: 'prefecture',
    source: '厚労省職業安定業務統計', surveyCycle: '毎月',
    unavailableReason: 'ハローワーク管轄区域単位であり、市区町村別データなし。',
    alternative: '都道府県データを参考値として利用' },

  // ── 派生指標（計算で算出） ──
  { id: 'aging_rate', name: '高齢化率', unit: '%', minGranularity: 'municipality',
    source: '国勢調査（population / population_65plus から算出）', surveyCycle: '5年' },
  { id: 'accom_share_est', name: '宿泊飲食業事業所構成比', unit: '%', minGranularity: 'municipality',
    source: '経済センサス（establishments_accom / establishments_all から算出）', surveyCycle: '約5年' },
  { id: 'accom_share_emp', name: '宿泊飲食業従業者構成比', unit: '%', minGranularity: 'municipality',
    source: '経済センサス（employees_accom / employees_all から算出）', surveyCycle: '約5年' },
  { id: 'hhi', name: 'HHI（ハーフィンダール指数）', unit: '指数', minGranularity: 'municipality',
    source: '調達データ等から算出', surveyCycle: '—' },
];

const METRICS_MAP = new Map<string, MetricDefinition>();
for (const m of METRICS) {
  METRICS_MAP.set(m.id, m);
}

// ── Public API ──

/**
 * 指定した指標が指定した粒度で利用可能かチェック
 */
export function checkMetricsAvailability(
  metricIds: string[],
  granularity: Granularity = 'municipality',
): AvailabilityResult {
  const available: AvailabilityResult['available'] = [];
  const unavailable: AvailabilityResult['unavailable'] = [];

  for (const id of metricIds) {
    const def = METRICS_MAP.get(id);
    if (!def) {
      unavailable.push({
        metric: id,
        name: id,
        reason: `指標 "${id}" は登録されていません。`,
      });
      continue;
    }

    // 取得不可フラグ
    if (def.unavailableReason && GRANULARITY_RANK[granularity] < GRANULARITY_RANK[def.minGranularity]) {
      unavailable.push({
        metric: id,
        name: def.name,
        reason: def.unavailableReason,
        alternative: def.alternative,
        availableAt: def.minGranularity,
      });
      continue;
    }

    // 粒度チェック
    if (GRANULARITY_RANK[granularity] < GRANULARITY_RANK[def.minGranularity]) {
      unavailable.push({
        metric: id,
        name: def.name,
        reason: `${def.name}は${def.minGranularity}レベル以上でのみ利用可能`,
        availableAt: def.minGranularity,
        alternative: def.alternative,
      });
      continue;
    }

    available.push({
      metric: id,
      name: def.name,
      unit: def.unit,
      source: def.source,
      availableYears: def.availableYears,
      surveyCycle: def.surveyCycle,
    });
  }

  return { available, unavailable };
}

/**
 * 指標の単位を取得
 */
export function getMetricUnit(id: string): string | null {
  return METRICS_MAP.get(id)?.unit ?? null;
}

/**
 * 指標の詳細情報を取得
 */
export function getMetricDefinition(id: string): MetricDefinition | null {
  return METRICS_MAP.get(id) ?? null;
}

/**
 * SSDS指標コードから単位情報を取得
 */
export function getUnitBySsdsCode(ssdsCode: string): string | null {
  for (const m of METRICS) {
    if (m.ssdsCodes?.includes(ssdsCode)) {
      return m.unit;
    }
  }
  return null;
}

/**
 * 登録済み指標の全リストを返す
 */
export function listMetrics(granularity?: Granularity): MetricDefinition[] {
  if (!granularity) return [...METRICS];
  return METRICS.filter(m => GRANULARITY_RANK[m.minGranularity] <= GRANULARITY_RANK[granularity]);
}

/**
 * 全指標IDのリスト
 */
export function listMetricIds(): string[] {
  return METRICS.map(m => m.id);
}
