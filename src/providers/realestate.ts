/**
 * 不動産情報ライブラリAPI Provider (国土交通省)
 * https://www.reinfolib.mlit.go.jp/
 * APIキー必要 (Ocp-Apim-Subscription-Key)
 */

import { fetchJson, buildUrl, createError } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const FUDOUSAN_BASE = 'https://www.reinfolib.mlit.go.jp/ex-api/external';

export interface RealEstateConfig {
  apiKey: string;
}

export interface RealEstateResponse {
  status?: string;
  data?: unknown[];
  [key: string]: unknown;
}

/** 不動産取引価格情報 */
export async function getRealEstateTransactions(config: RealEstateConfig, params: {
  year: string;
  quarter: string;
  area?: string;
  city?: string;
}): Promise<ApiResponse<RealEstateResponse>> {
  if (!config.apiKey?.trim()) {
    return createError('不動産情報ライブラリ/transactions', 'API key is required');
  }
  if (!params.year?.trim() || !params.quarter?.trim()) {
    return createError('不動産情報ライブラリ/transactions', 'year and quarter are required');
  }
  const url = buildUrl(`${FUDOUSAN_BASE}/XIT001`, {
    year: params.year, quarter: params.quarter,
    area: params.area, city: params.city,
  });
  return fetchJson<RealEstateResponse>(url, {
    source: '不動産情報ライブラリ/transactions',
    headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
  });
}

/** 地価公示・地価調査 */
export async function getLandPrice(config: RealEstateConfig, params: {
  year: string;
  area?: string;
  city?: string;
}): Promise<ApiResponse<RealEstateResponse>> {
  if (!config.apiKey?.trim()) {
    return createError('不動産情報ライブラリ/landPrice', 'API key is required');
  }
  if (!params.year?.trim()) {
    return createError('不動産情報ライブラリ/landPrice', 'year is required');
  }
  const url = buildUrl(`${FUDOUSAN_BASE}/XIT002`, {
    year: params.year, area: params.area, city: params.city,
  });
  return fetchJson<RealEstateResponse>(url, {
    source: '不動産情報ライブラリ/landPrice',
    headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
  });
}
