/**
 * Geoshape API Provider (NII)
 * 市区町村・都道府県境界GeoJSON
 * https://geoshape.ex.nii.ac.jp/
 * APIキー不要
 */

import { fetchJson, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const CITY_BASE = 'https://geoshape.ex.nii.ac.jp/city/geojson';
const PREF_BASE = 'https://geoshape.ex.nii.ac.jp/pref/geojson';

/** 市区町村境界GeoJSON取得 */
export async function getCityBoundary(params: {
  code: string;
}): Promise<ApiResponse> {
  if (!params.code?.trim()) {
    return createError('Geoshape/city', 'code is required');
  }
  if (!/^\d{5}$/.test(params.code)) {
    return createError('Geoshape/city', 'code must be a 5-digit municipality code (e.g. 13101)');
  }
  return fetchJson(`${CITY_BASE}/N03-20230101_${params.code}.geojson`, {
    source: 'Geoshape/city',
    cacheTtl: CacheTTL.MASTER,
  });
}

/** 都道府県境界GeoJSON取得 */
export async function getPrefBoundary(params: {
  prefCode: string;
}): Promise<ApiResponse> {
  if (!params.prefCode?.trim()) {
    return createError('Geoshape/pref', 'prefCode is required');
  }
  if (!/^\d{2}$/.test(params.prefCode)) {
    return createError('Geoshape/pref', 'prefCode must be a 2-digit code');
  }
  return fetchJson(`${PREF_BASE}/N03-20230101_${params.prefCode}000.geojson`, {
    source: 'Geoshape/pref',
    cacheTtl: CacheTTL.MASTER,
  });
}
