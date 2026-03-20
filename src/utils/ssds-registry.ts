/**
 * SSDS（社会・人口統計体系）指標コードレジストリ
 *
 * e-Stat SSDS テーブルの指標コード体系を管理し、
 * C2107 vs C2108 のような「同じ概念だが異なるコード」の
 * 発見・選択を支援する。
 */

// ── 型定義 ──

export interface SsdsIndicator {
  /** 指標コード（例: C2108） */
  code: string;
  /** 表示ラベル */
  label: string;
  /** 単位 */
  unit: string;
  /** 所属テーブルID */
  table: string;
  /** 大分類（A=人口, C=経済, D=行政, E=教育, ...） */
  section: string;
  /** 調査名 */
  surveyName: string;
  /** 利用可能年 */
  availableYears: number[];
  /** 備考 */
  notes?: string;
  /** 推奨度: preferred=推奨, alternative=代替, legacy=旧版 */
  recommendation: 'preferred' | 'alternative' | 'legacy';
  /** 関連コード（同じ概念の別バリエーション） */
  relatedCodes?: string[];
}

// ── 指標コードデータ ──

const INDICATORS: SsdsIndicator[] = [
  // ════════════════════════════════════════
  //  A 人口・世帯 (table 0000020101)
  // ════════════════════════════════════════
  { code: 'A1101', label: '総人口', unit: '人', table: '0000020101',
    section: 'A', surveyName: '国勢調査',
    availableYears: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020],
    recommendation: 'preferred' },
  { code: 'A110101', label: '総人口（男）', unit: '人', table: '0000020101',
    section: 'A', surveyName: '国勢調査',
    availableYears: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020],
    recommendation: 'alternative' },
  { code: 'A110102', label: '総人口（女）', unit: '人', table: '0000020101',
    section: 'A', surveyName: '国勢調査',
    availableYears: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020],
    recommendation: 'alternative' },
  { code: 'A1301', label: '15歳未満人口', unit: '人', table: '0000020101',
    section: 'A', surveyName: '国勢調査',
    availableYears: [2000, 2005, 2010, 2015, 2020],
    recommendation: 'preferred' },
  { code: 'A1302', label: '15〜64歳人口', unit: '人', table: '0000020101',
    section: 'A', surveyName: '国勢調査',
    availableYears: [2000, 2005, 2010, 2015, 2020],
    recommendation: 'preferred' },
  { code: 'A1303', label: '65歳以上人口', unit: '人', table: '0000020101',
    section: 'A', surveyName: '国勢調査',
    availableYears: [2000, 2005, 2010, 2015, 2020],
    recommendation: 'preferred' },
  { code: 'A7101', label: '世帯数', unit: '世帯', table: '0000020101',
    section: 'A', surveyName: '国勢調査',
    availableYears: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020],
    recommendation: 'preferred' },

  // ════════════════════════════════════════
  //  C 経済基盤 (table 0000020103)
  // ════════════════════════════════════════

  // --- 事業所数（全産業） ---
  { code: 'C2107', label: '事業所数（全産業・基礎調査）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス基礎調査',
    availableYears: [2009, 2014],
    recommendation: 'legacy', relatedCodes: ['C2108'],
    notes: '基礎調査は2009/2014のみ。活動調査ベースのC2108を推奨。' },
  { code: 'C2108', label: '事業所数（民営全産業）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2009, 2011, 2014, 2016, 2021],
    recommendation: 'preferred', relatedCodes: ['C2107'],
    notes: '民営事業所数。C2107より年次カバレッジが広い。' },

  // --- 事業所数（産業別） ---
  { code: 'C210719', label: '事業所数（宿泊飲食・基礎調査）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス基礎調査',
    availableYears: [2009, 2014],
    recommendation: 'legacy', relatedCodes: ['C210847'],
    notes: '基礎調査ベース。C210847を推奨。' },
  { code: 'C210847', label: '事業所数（民営・宿泊業飲食サービス業）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2011, 2014, 2016, 2021],
    recommendation: 'preferred', relatedCodes: ['C210719'] },
  { code: 'C210801', label: '事業所数（民営・建設業）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2009, 2011, 2014, 2016, 2021],
    recommendation: 'preferred' },
  { code: 'C210802', label: '事業所数（民営・製造業）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2009, 2011, 2014, 2016, 2021],
    recommendation: 'preferred' },
  { code: 'C210845', label: '事業所数（民営・卸売業小売業）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2011, 2014, 2016, 2021],
    recommendation: 'preferred' },
  { code: 'C210848', label: '事業所数（民営・医療福祉）', unit: '事業所', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2011, 2014, 2016, 2021],
    recommendation: 'preferred' },

  // --- 従業者数 ---
  { code: 'C2208', label: '従業者数（民営全産業）', unit: '人', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2009, 2011, 2014, 2016, 2021],
    recommendation: 'preferred' },
  { code: 'C220847', label: '従業者数（民営・宿泊業飲食サービス業）', unit: '人', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2011, 2014, 2016, 2021],
    recommendation: 'preferred' },

  // --- 売上・付加価値 ---
  { code: 'C610117', label: '売上金額（宿泊業飲食サービス業）', unit: '百万円', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2011, 2013, 2015, 2020],
    recommendation: 'preferred',
    notes: '経済センサス活動調査ベース。年次は調査実施年ではなく対象年。' },
  { code: 'C620117', label: '付加価値額（宿泊業飲食サービス業）', unit: '百万円', table: '0000020103',
    section: 'C', surveyName: '経済センサス活動調査',
    availableYears: [2011, 2015, 2020],
    recommendation: 'preferred' },

  // ════════════════════════════════════════
  //  D 行政基盤 (table 0000020104)
  // ════════════════════════════════════════
  { code: 'D2201', label: '財政力指数', unit: '指数', table: '0000020104',
    section: 'D', surveyName: '地方財政状況調査',
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i),
    recommendation: 'preferred' },
  { code: 'D2203', label: '経常収支比率', unit: '%', table: '0000020104',
    section: 'D', surveyName: '地方財政状況調査',
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i),
    recommendation: 'preferred' },
  { code: 'D320101', label: '地方税', unit: '千円', table: '0000020104',
    section: 'D', surveyName: '地方財政状況調査',
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i),
    recommendation: 'preferred',
    notes: '単位は千円。百万円に変換するには÷1000。' },
  { code: 'D320307', label: '商工費', unit: '千円', table: '0000020104',
    section: 'D', surveyName: '地方財政状況調査',
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i),
    recommendation: 'preferred',
    notes: '単位は千円。百万円に変換するには÷1000。' },
  { code: 'D3203', label: '歳出決算総額', unit: '千円', table: '0000020104',
    section: 'D', surveyName: '地方財政状況調査',
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i),
    recommendation: 'preferred' },
  { code: 'D3201', label: '歳入決算総額', unit: '千円', table: '0000020104',
    section: 'D', surveyName: '地方財政状況調査',
    availableYears: Array.from({ length: 15 }, (_, i) => 2009 + i),
    recommendation: 'preferred' },
];

// ── インデックス構築 ──

const CODE_MAP = new Map<string, SsdsIndicator>();
for (const ind of INDICATORS) {
  CODE_MAP.set(ind.code, ind);
}

const TABLE_INDEX = new Map<string, SsdsIndicator[]>();
for (const ind of INDICATORS) {
  const list = TABLE_INDEX.get(ind.table) ?? [];
  list.push(ind);
  TABLE_INDEX.set(ind.table, list);
}

// ── Public API ──

/**
 * テーブルIDやキーワードで指標コードをブラウズ
 */
export function browseIndicators(params?: {
  tableId?: string;
  keyword?: string;
  section?: string;
  recommendedOnly?: boolean;
}): SsdsIndicator[] {
  let results = [...INDICATORS];

  if (params?.tableId) {
    results = results.filter(i => i.table === params.tableId);
  }
  if (params?.section) {
    results = results.filter(i => i.section === params.section);
  }
  if (params?.keyword) {
    const kw = params.keyword.toLowerCase();
    results = results.filter(i =>
      i.label.toLowerCase().includes(kw) ||
      i.code.toLowerCase().includes(kw) ||
      (i.notes?.toLowerCase().includes(kw) ?? false)
    );
  }
  if (params?.recommendedOnly) {
    results = results.filter(i => i.recommendation === 'preferred');
  }

  return results;
}

/**
 * 指標コードから詳細情報を取得
 */
export function getIndicatorInfo(code: string): SsdsIndicator | null {
  return CODE_MAP.get(code) ?? null;
}

/**
 * 指標コードの単位を取得
 */
export function getIndicatorUnit(code: string): string | null {
  return CODE_MAP.get(code)?.unit ?? null;
}

/**
 * 関連コード（同じ概念の別バリエーション）を取得
 */
export function getRelatedIndicators(code: string): SsdsIndicator[] {
  const info = CODE_MAP.get(code);
  if (!info?.relatedCodes) return [];
  return info.relatedCodes
    .map(c => CODE_MAP.get(c))
    .filter((i): i is SsdsIndicator => i !== undefined);
}

/**
 * テーブルIDに含まれる全指標コードを取得
 */
export function getTableIndicators(tableId: string): SsdsIndicator[] {
  return TABLE_INDEX.get(tableId) ?? [];
}

/**
 * 推奨コードを返す（legacyコードに対してpreferredを提案）
 */
export function getRecommendedCode(code: string): SsdsIndicator | null {
  const info = CODE_MAP.get(code);
  if (!info) return null;
  if (info.recommendation === 'preferred') return info;

  // 関連コードからpreferredを探す
  for (const rc of info.relatedCodes ?? []) {
    const related = CODE_MAP.get(rc);
    if (related?.recommendation === 'preferred') return related;
  }
  return info;
}

/**
 * 全セクション一覧
 */
export function listSections(): { section: string; label: string; count: number }[] {
  const sectionLabels: Record<string, string> = {
    A: '人口・世帯',
    C: '経済基盤',
    D: '行政基盤',
  };

  const counts = new Map<string, number>();
  for (const ind of INDICATORS) {
    counts.set(ind.section, (counts.get(ind.section) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([section, count]) => ({
    section,
    label: sectionLabels[section] ?? section,
    count,
  }));
}
