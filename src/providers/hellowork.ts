/**
 * 求人情報webAPI Provider (厚生労働省/ハローワーク)
 * APIキー必要 (X-API-KEY)
 */

import { fetchJson, buildUrl, createError } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const HELLOWORK_BASE = 'https://api.hellowork.mhlw.go.jp/gateway/v1';

export interface HelloworkConfig {
  apiKey: string;
}

/** 求人情報検索 */
export async function searchJobs(config: HelloworkConfig, params: {
  keyword?: string;
  prefCode?: string;
  occupation?: string;
  employment?: string;
  page?: number;
}): Promise<ApiResponse> {
  if (!config.apiKey?.trim()) {
    return createError('ハローワーク/offers', 'ハローワーク API key is required');
  }
  const url = buildUrl(`${HELLOWORK_BASE}/offers`, {
    keyword: params.keyword, prefCode: params.prefCode,
    occupation: params.occupation, employment: params.employment,
    page: params.page || 1,
  });
  return fetchJson(url, { headers: { 'X-API-KEY': config.apiKey }, source: 'ハローワーク/offers' });
}
