/**
 * 法令API V2 Provider (デジタル庁/e-Gov)
 * https://laws.e-gov.go.jp/docs/api/
 * APIキー不要
 */

import { fetchJson, buildUrl, createError } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const ELAWS_BASE = 'https://laws.e-gov.go.jp/api/2';

export interface ELawsResponse {
  [key: string]: unknown;
}

/** 法令一覧取得 */
export async function searchLaws(params: {
  category?: number;  // 1:憲法 2:法律 3:政令 4:勅令 5:府省令 6:規則
  offset?: number;
  limit?: number;
}): Promise<ApiResponse<ELawsResponse>> {
  const cat = params.category ?? 2;
  if (!Number.isInteger(cat) || cat < 1 || cat > 6) {
    return createError('法令API/laws', 'category must be an integer between 1 and 6');
  }
  const url = buildUrl(`${ELAWS_BASE}/laws`, {
    category: cat,
    offset: params.offset ?? 0,
    limit: params.limit ?? 20,
  });
  return fetchJson<ELawsResponse>(url, { source: '法令API/laws' });
}

/** 法令本文取得 */
export async function getLawData(params: {
  lawId?: string;
  lawRevisionId?: string;
}): Promise<ApiResponse<ELawsResponse>> {
  const id = params.lawId || params.lawRevisionId;
  if (!id?.trim()) {
    return createError('法令API/fulltext', 'lawId is required');
  }
  if (!/^[a-zA-Z0-9_\-%.]+$/.test(id)) {
    return createError('法令API/fulltext', 'lawId contains invalid characters');
  }
  const url = buildUrl(`${ELAWS_BASE}/law_data/${id}`, {
    response_format: 'json',
  });
  return fetchJson<ELawsResponse>(url, {
    source: '法令API/fulltext',
  });
}

/** 法令キーワード検索 */
export async function searchLawsByKeyword(params: {
  keyword: string;
  offset?: number;
  limit?: number;
}): Promise<ApiResponse<ELawsResponse>> {
  if (!params.keyword?.trim()) {
    return createError('法令API/laws', 'keyword is required');
  }
  const url = buildUrl(`${ELAWS_BASE}/laws`, {
    keyword: params.keyword,
    offset: params.offset ?? 0,
    limit: params.limit ?? 20,
  });
  return fetchJson<ELawsResponse>(url, { source: '法令API/laws' });
}
