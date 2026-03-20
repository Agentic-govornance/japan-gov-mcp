/**
 * 学術・文化 API Provider
 * NDL + J-STAGE + ジャパンサーチ + CiNii + IRDB
 * APIキー不要
 */

import { fetchJson, fetchXml, buildUrl, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

// ═══════════════════════════════════════════════
// 国立国会図書館サーチ (NDL Search)
// https://iss.ndl.go.jp/information/api/
// ═══════════════════════════════════════════════

const NDL_BASE = 'https://ndlsearch.ndl.go.jp/api/opensearch';

/** NDL書籍・雑誌・論文を横断検索 (RSS/XML) */
export async function searchNdl(params: {
  query: string;
  count?: number;
}): Promise<ApiResponse> {
  if (!params.query?.trim()) {
    return createError('NDL/search', 'query is required');
  }
  const url = buildUrl(NDL_BASE, {
    any: params.query,
    cnt: params.count || 20,
  });
  return fetchXml(url, {
    source: 'NDL/search',
    cacheTtl: CacheTTL.SEARCH,
  });
}

// ═══════════════════════════════════════════════
// J-STAGE (科学技術振興機構)
// https://www.jstage.jst.go.jp/
// ═══════════════════════════════════════════════

const JSTAGE_BASE = 'https://api.jstage.jst.go.jp/searchapi/do';

/** J-STAGE学術論文検索 */
export async function searchJstage(params: {
  query: string;
  count?: number;
  start?: number;
  pubyearfrom?: string;
  pubyearto?: string;
}): Promise<ApiResponse<string>> {
  if (!params.query?.trim()) {
    return createError('J-STAGE/search', 'query is required');
  }
  const url = buildUrl(JSTAGE_BASE, {
    service: 3,
    article: params.query,
    count: params.count || 20,
    start: params.start || 1,
    pubyearfrom: params.pubyearfrom,
    pubyearto: params.pubyearto,
  });
  return fetchXml(url, {
    source: 'J-STAGE/search',
    timeout: 45000,
    cacheTtl: CacheTTL.SEARCH,
  });
}

// ═══════════════════════════════════════════════
// ジャパンサーチ (デジタル庁)
// https://jpsearch.go.jp/
// ═══════════════════════════════════════════════

const JAPANSEARCH_BASE = 'https://jpsearch.go.jp/api/item/search/jps-cross';

/** ジャパンサーチ横断検索 */
export async function searchJapanSearch(params: {
  keyword: string;
  size?: number;
  from?: number;
}): Promise<ApiResponse> {
  if (!params.keyword?.trim()) {
    return createError('ジャパンサーチ/search', 'keyword is required');
  }
  const url = buildUrl(JAPANSEARCH_BASE, {
    keyword: params.keyword,
    size: params.size || 20,
    from: params.from || 0,
  });
  return fetchJson(url, {
    source: 'ジャパンサーチ/search',
    cacheTtl: CacheTTL.SEARCH,
  });
}

// ═══════════════════════════════════════════════
// CiNii Research (国立情報学研究所)
// https://support.nii.ac.jp/ja/cir/r_opensearch
// ═══════════════════════════════════════════════

const CINII_BASE = 'https://cir.nii.ac.jp/opensearch/articles';

/** CiNii Research 横断検索 */
export async function searchCinii(params: {
  query: string;
  count?: number;
}): Promise<ApiResponse> {
  if (!params.query?.trim()) {
    return createError('CiNii/search', 'query is required');
  }
  const url = buildUrl(CINII_BASE, {
    q: params.query,
    count: params.count || 20,
    format: 'json',
  });
  return fetchJson(url, {
    source: 'CiNii/search',
    cacheTtl: CacheTTL.SEARCH,
  });
}

// ═══════════════════════════════════════════════
// IRDB (学術機関リポジトリデータベース)
// https://support.irdb.nii.ac.jp/
// ═══════════════════════════════════════════════

const IRDB_BASE = 'https://irdb.nii.ac.jp/opensearch/search';

/** IRDB 学術機関リポジトリ検索 (OpenSearch) */
export async function searchIrdb(params: {
  query?: string;
  title?: string;
  author?: string;
  count?: number;
}): Promise<ApiResponse<string>> {
  if (!params.query?.trim() && !params.title?.trim() && !params.author?.trim()) {
    return createError('IRDB/search', 'query, title, or author is required');
  }
  const url = buildUrl(IRDB_BASE, {
    q: params.query,
    title: params.title,
    creator: params.author,
    count: params.count || 20,
  });
  return fetchXml(url, {
    source: 'IRDB/search',
    cacheTtl: CacheTTL.SEARCH,
  });
}
