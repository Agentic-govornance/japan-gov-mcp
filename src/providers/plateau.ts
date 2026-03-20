/**
 * PLATEAU API Provider (国交省 3D都市モデル)
 * https://www.geospatial.jp/ckan/dataset?tags=PLATEAU
 * APIキー不要
 */

import { fetchJson, buildUrl, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://www.geospatial.jp/ckan/api/3';

interface PlateauDataset {
  prefecture?: string;
  city?: string;
  type?: string;
  [key: string]: unknown;
}

/** PLATEAU 3D都市モデルデータセット検索 */
export async function searchPlateauDatasets(params: {
  prefecture?: string;
  city?: string;
  type?: string;
}): Promise<ApiResponse> {
  const url = buildUrl(`${BASE_URL}/action/package_search`, {
    q: 'PLATEAU',
    fq: 'tags:PLATEAU',
    rows: 100,
  });
  const result = await fetchJson(url, {
    source: 'PLATEAU/search',
    timeout: 60000,
    cacheTtl: CacheTTL.SEARCH,
  });

  if (!result.success) return result;

  // Unwrap CKAN envelope: { success, result: { results: [...] } }
  const ckanData = result.data as { success?: boolean; result?: { results?: PlateauDataset[] }; error?: { message?: string } };
  if (ckanData?.success === false) {
    return createError('PLATEAU/search', ckanData.error?.message || 'CKAN API returned success: false');
  }

  // Client-side filtering
  let filtered: PlateauDataset[] = ckanData?.result?.results ?? [];
  if (params.prefecture) {
    filtered = filtered.filter(d => d.prefecture === params.prefecture);
  }
  if (params.city) {
    filtered = filtered.filter(d => d.city === params.city);
  }
  if (params.type) {
    filtered = filtered.filter(d => d.type === params.type);
  }

  return { ...result, data: filtered };
}

/** メッシュコード指定でCityGML情報取得 */
export async function getPlateauCitygml(params: {
  meshCode: string;
}): Promise<ApiResponse> {
  if (!params.meshCode?.trim()) {
    return createError('PLATEAU/citygml', 'meshCode is required');
  }
  if (!/^\d{8}$/.test(params.meshCode)) {
    return createError('PLATEAU/citygml', 'meshCode must be 8 digits');
  }
  return fetchJson(`${BASE_URL}/citygml/m:${params.meshCode}`, {
    source: 'PLATEAU/citygml',
    timeout: 60000,
    cacheTtl: CacheTTL.DATA,
  });
}
