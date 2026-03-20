/**
 * データカタログサイトAPI Provider (デジタル庁)
 * https://www.data.go.jp/ (CKAN API)
 * APIキー不要
 */

import { fetchJson, buildUrl, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const DATACATALOG_BASE = 'https://www.data.go.jp/data/api/3';

export interface CkanResponse {
  help?: string;
  success?: boolean;
  result?: unknown;
  error?: { message?: string; __type?: string };
  [key: string]: unknown;
}

/** CKANレスポンスのsuccess:falseチェック */
function checkCkanSuccess(result: ApiResponse<CkanResponse>, source: string): ApiResponse<CkanResponse> {
  if (result.success) {
    const ckan = result.data;
    if (ckan?.success === false) {
      return createError(source, ckan.error?.message || 'CKAN API returned success: false');
    }
  }
  return result;
}

/** データセット検索 */
export async function searchDatasets(params: {
  q?: string;
  fq?: string;
  rows?: number;
  start?: number;
  sort?: string;
}): Promise<ApiResponse<CkanResponse>> {
  const url = buildUrl(`${DATACATALOG_BASE}/action/package_search`, {
    q: params.q, fq: params.fq,
    rows: params.rows || 20, start: params.start || 0,
    sort: params.sort,
  });
  const result = await fetchJson<CkanResponse>(url, { source: 'データカタログ/search' });
  return checkCkanSuccess(result, 'データカタログ/search');
}

/** データセット詳細 */
export async function getDatasetDetail(params: { id: string }): Promise<ApiResponse<CkanResponse>> {
  if (!params.id?.trim()) {
    return createError('データカタログ/detail', 'id is required');
  }
  const url = buildUrl(`${DATACATALOG_BASE}/action/package_show`, { id: params.id });
  const result = await fetchJson<CkanResponse>(url, { source: 'データカタログ/detail' });
  return checkCkanSuccess(result, 'データカタログ/detail');
}

/** 組織一覧 */
export async function listOrganizations(): Promise<ApiResponse<CkanResponse>> {
  return fetchJson<CkanResponse>(`${DATACATALOG_BASE}/action/organization_list?all_fields=true`, {
    source: 'データカタログ/organizations',
    cacheTtl: CacheTTL.MASTER,
  });
}
