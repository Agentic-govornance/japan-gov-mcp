/**
 * 市区町村合併 境界検知モジュール
 *
 * 平成の大合併（1999-2010）を中心に、主要な合併情報を保持し、
 * 時系列データ利用時の境界越え警告を生成する。
 */

// ── 型定義 ──

export interface MergerInfo {
  /** 合併後の市区町村コード（5桁） */
  code: string;
  /** 合併後の市区町村名 */
  name: string;
  /** 合併日 YYYY-MM-DD */
  mergerDate: string;
  /** 合併前の構成自治体 */
  preMergerEntities: { name: string; code?: string }[];
  /** 合併方式 */
  type: 'new' | 'absorption';
}

export interface MergerWarning {
  type: 'MERGER_BOUNDARY_CROSSED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  code: string;
  name: string;
  mergerDate: string;
  mergerYear: number;
  message: string;
  preMergerNames: string[];
  affectedYears: { before: number[]; after: number[] };
}

// ── 合併データ ──
// 平成の大合併を中心とした主要合併リスト
// 温泉観光地・分析対象自治体を重点収録

const MERGERS: MergerInfo[] = [
  // ── 山口県 ──
  { code: '35211', name: '長門市', mergerDate: '2005-03-22',
    preMergerEntities: [
      { name: '長門市', code: '35211' }, { name: '日置町', code: '35361' },
      { name: '三隅町', code: '35362' }, { name: '油谷町', code: '35363' },
    ], type: 'new' },
  { code: '35203', name: '下関市', mergerDate: '2005-02-13',
    preMergerEntities: [
      { name: '下関市' }, { name: '菊川町' }, { name: '豊田町' }, { name: '豊浦町' }, { name: '豊北町' },
    ], type: 'absorption' },
  { code: '35204', name: '萩市', mergerDate: '2005-03-06',
    preMergerEntities: [
      { name: '萩市' }, { name: '川上村' }, { name: '田万川町' }, { name: 'むつみ村' },
      { name: '須佐町' }, { name: '旭村' }, { name: '福栄村' },
    ], type: 'absorption' },

  // ── 兵庫県 ──
  { code: '28209', name: '豊岡市', mergerDate: '2005-04-01',
    preMergerEntities: [
      { name: '豊岡市' }, { name: '城崎町' }, { name: '竹野町' },
      { name: '日高町' }, { name: '出石町' }, { name: '但東町' },
    ], type: 'new' },
  { code: '28220', name: '丹波篠山市', mergerDate: '1999-04-01',
    preMergerEntities: [
      { name: '篠山町' }, { name: '今田町' }, { name: '丹南町' }, { name: '西紀町' },
    ], type: 'new' },

  // ── 大分県 ──
  { code: '44213', name: '由布市', mergerDate: '2005-10-01',
    preMergerEntities: [
      { name: '挾間町' }, { name: '庄内町' }, { name: '湯布院町' },
    ], type: 'new' },
  { code: '44204', name: '別府市', mergerDate: '1955-04-01',
    preMergerEntities: [{ name: '別府市' }, { name: '朝日村' }, { name: '南石垣村' }], type: 'absorption' },

  // ── 栃木県 ──
  { code: '09213', name: '那須塩原市', mergerDate: '2005-01-01',
    preMergerEntities: [
      { name: '黒磯市' }, { name: '西那須野町' }, { name: '塩原町' },
    ], type: 'new' },
  { code: '09203', name: '日光市', mergerDate: '2006-03-20',
    preMergerEntities: [
      { name: '日光市' }, { name: '今市市' }, { name: '足尾町' }, { name: '栗山村' }, { name: '藤原町' },
    ], type: 'new' },

  // ── 島根県 ──
  { code: '32201', name: '松江市', mergerDate: '2005-03-31',
    preMergerEntities: [
      { name: '松江市' }, { name: '鹿島町' }, { name: '島根町' }, { name: '美保関町' },
      { name: '八雲村' }, { name: '玉湯町' }, { name: '宍道町' }, { name: '八束町' },
    ], type: 'absorption' },

  // ── 鹿児島県 ──
  { code: '46210', name: '指宿市', mergerDate: '2006-01-01',
    preMergerEntities: [
      { name: '指宿市' }, { name: '山川町' }, { name: '開聞町' },
    ], type: 'absorption' },

  // ── 群馬県（草津町は合併なし） ──
  // ── 神奈川県（箱根町は合併なし） ──

  // ── 主要温泉観光地 ──
  { code: '06207', name: '鶴岡市', mergerDate: '2005-10-01',
    preMergerEntities: [
      { name: '鶴岡市' }, { name: '藤島町' }, { name: '羽黒町' }, { name: '櫛引町' },
      { name: '朝日村' }, { name: '温海町' },
    ], type: 'absorption' },
  { code: '07203', name: '会津若松市', mergerDate: '2004-11-01',
    preMergerEntities: [
      { name: '会津若松市' }, { name: '北会津村' },
    ], type: 'absorption' },
  { code: '18207', name: '加賀市', mergerDate: '2005-10-01',
    preMergerEntities: [
      { name: '加賀市' }, { name: '山中町' },
    ], type: 'absorption' },
  { code: '22205', name: '熱海市', mergerDate: '1957-04-01',
    preMergerEntities: [{ name: '熱海市' }, { name: '多賀村' }], type: 'absorption' },

  // ── 政令指定都市・中核市の主要合併 ──
  { code: '01100', name: 'さいたま市', mergerDate: '2001-05-01',
    preMergerEntities: [
      { name: '浦和市' }, { name: '大宮市' }, { name: '与野市' },
    ], type: 'new' },
  { code: '22130', name: '静岡市', mergerDate: '2003-04-01',
    preMergerEntities: [
      { name: '静岡市' }, { name: '清水市' },
    ], type: 'new' },
  { code: '22131', name: '浜松市', mergerDate: '2005-07-01',
    preMergerEntities: [
      { name: '浜松市' }, { name: '天竜市' }, { name: '浜北市' },
      { name: '舞阪町' }, { name: '雄踏町' }, { name: '細江町' },
      { name: '引佐町' }, { name: '三ヶ日町' }, { name: '春野町' },
      { name: '佐久間町' }, { name: '水窪町' }, { name: '龍山村' },
    ], type: 'absorption' },
  { code: '15100', name: '新潟市', mergerDate: '2005-03-21',
    preMergerEntities: [
      { name: '新潟市' }, { name: '新津市' }, { name: '白根市' }, { name: '豊栄市' },
      { name: '小須戸町' }, { name: '横越町' }, { name: '亀田町' }, { name: '岩室村' },
      { name: '西川町' }, { name: '味方村' }, { name: '潟東村' }, { name: '月潟村' }, { name: '中之口村' },
    ], type: 'absorption' },
];

// ── コード→情報のマップ ──
const MERGER_MAP = new Map<string, MergerInfo>();
for (const m of MERGERS) {
  MERGER_MAP.set(m.code, m);
  // 6桁コード（チェックディジット付き）でもヒットさせる
  MERGER_MAP.set(m.code + '0', m);
}

// ── Public API ──

/**
 * 市区町村コードから合併情報を取得
 * @param code 5桁または6桁の市区町村コード
 */
export function getMergerInfo(code: string): MergerInfo | null {
  const normalized = code.replace(/^0+/, '').padStart(5, '0');
  return MERGER_MAP.get(normalized) ?? MERGER_MAP.get(code) ?? null;
}

/**
 * 指定された年リストが合併境界を跨ぐかチェック
 * @param code 市区町村コード
 * @param years チェック対象年のリスト（省略時は合併情報のみ返す）
 */
export function checkMergerWarning(
  code: string,
  years?: number[],
): MergerWarning | null {
  const info = getMergerInfo(code);
  if (!info) return null;

  const mergerYear = parseInt(info.mergerDate.split('-')[0], 10);

  if (!years || years.length === 0) {
    return {
      type: 'MERGER_BOUNDARY_CROSSED',
      severity: 'MEDIUM',
      code: info.code,
      name: info.name,
      mergerDate: info.mergerDate,
      mergerYear,
      message: `${info.name}は${info.mergerDate}に合併。合併前後でデータの定義が異なる。`,
      preMergerNames: info.preMergerEntities.map(e => e.name),
      affectedYears: { before: [], after: [] },
    };
  }

  const before = years.filter(y => y < mergerYear);
  const after = years.filter(y => y >= mergerYear);

  // 合併境界を跨がない場合
  if (before.length === 0 || after.length === 0) {
    return null;
  }

  return {
    type: 'MERGER_BOUNDARY_CROSSED',
    severity: 'HIGH',
    code: info.code,
    name: info.name,
    mergerDate: info.mergerDate,
    mergerYear,
    message:
      `${info.name}は${info.mergerDate}に${info.preMergerEntities.length}自治体が合併。` +
      `指定年 [${years.join(',')}] は合併境界(${mergerYear}年)を跨ぐ。` +
      `合併前データは旧${info.preMergerEntities[0].name}等の個別データであり、合併後と直接比較不可。`,
    preMergerNames: info.preMergerEntities.map(e => e.name),
    affectedYears: { before, after },
  };
}

/**
 * 複数コードの合併情報を一括チェック
 */
export function checkMergerWarnings(
  codes: string[],
  years?: number[],
): MergerWarning[] {
  const warnings: MergerWarning[] = [];
  for (const code of codes) {
    const w = checkMergerWarning(code, years);
    if (w) warnings.push(w);
  }
  return warnings;
}

/**
 * 全合併情報リストを返す（ブラウジング用）
 */
export function listMergers(): MergerInfo[] {
  return [...MERGERS];
}
