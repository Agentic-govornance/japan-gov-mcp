/**
 * AgriKnowledge API Provider (農研機構)
 * https://agriknowledge.affrc.go.jp/
 * APIキー不要
 */

import { fetchJson, buildUrl, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const AGRI_BASE = 'https://agriknowledge.affrc.go.jp/RNJ/api/2.0';

/** 農業技術・試験研究成果を検索 */
export async function searchAgriKnowledge(params: {
  query: string;
  count?: number;
}): Promise<ApiResponse> {
  if (!params.query?.trim()) {
    return createError('AgriKnowledge/search', 'query is required');
  }
  const url = buildUrl(`${AGRI_BASE}/search`, {
    query: params.query,
    count: params.count || 20,
  });
  return fetchJson(url, {
    source: 'AgriKnowledge/search',
    cacheTtl: CacheTTL.SEARCH,
  });
}
