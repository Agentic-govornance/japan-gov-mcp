/**
 * G空間情報センター API Provider (CKAN ベース)
 * https://www.geospatial.jp/
 * APIキー不要
 */

import { fetchJson, buildUrl, ensureRequired, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://www.geospatial.jp/ckan/api/3';

/** 地理空間データ横断検索 */
export async function searchGeospatial(params: {
  q?: string;
  fq?: string;
  rows?: number;
  start?: number;
  sort?: string;
}): Promise<ApiResponse> {
  const url = buildUrl(`${BASE_URL}/action/package_search`, {
    q: params.q,
    fq: params.fq,
    rows: params.rows || 20,
    start: params.start || 0,
    sort: params.sort,
  });
  const result = await fetchJson(url, {
    source: 'G空間情報センター/search',
    cacheTtl: CacheTTL.SEARCH,
  });
  if (result.success) {
    const ckan = result.data as { success?: boolean; error?: { message?: string } };
    if (ckan?.success === false) {
      return createError('G空間情報センター/search', ckan.error?.message || 'CKAN API returned success: false');
    }
  }
  return result;
}

/** データセット詳細 */
export async function getGeospatialDataset(params: {
  id: string;
}): Promise<ApiResponse> {
  const err = ensureRequired(params.id, 'id', 'G空間情報センター/dataset');
  if (err) return err;
  const url = buildUrl(`${BASE_URL}/action/package_show`, { id: params.id });
  return fetchJson(url, {
    source: 'G空間情報センター/dataset',
    cacheTtl: CacheTTL.DATA,
  });
}

/** 組織一覧 */
export async function listGeospatialOrganizations(): Promise<ApiResponse> {
  return fetchJson(`${BASE_URL}/action/organization_list?all_fields=true&limit=100`, {
    source: 'G空間情報センター/organizations',
    cacheTtl: CacheTTL.MASTER,
  });
}
