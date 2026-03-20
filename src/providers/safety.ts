/**
 * 海外安全情報オープンデータ Provider (外務省)
 * https://www.ezairyu.mofa.go.jp/html/opendata/index.html
 * APIキー不要
 */

import { fetchXml, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const ANZEN_BASE = 'https://www.ezairyu.mofa.go.jp/opendata';

/** 海外安全情報取得 (XML) */
export async function getSafetyInfo(params: {
  regionCode?: string;
  countryCode?: string;
}): Promise<ApiResponse<string>> {
  if (params.countryCode && !/^\d{3,4}$/.test(params.countryCode)) {
    return createError('海外安全情報', 'countryCode must be a 3-4 digit code');
  }
  if (params.regionCode && !/^\d{2,3}$/.test(params.regionCode)) {
    return createError('海外安全情報', 'regionCode must be a 2-3 digit code');
  }
  const url = params.countryCode
    ? `${ANZEN_BASE}/country/${params.countryCode}.xml`
    : params.regionCode
      ? `${ANZEN_BASE}/area/${params.regionCode}.xml`
      : `${ANZEN_BASE}/area/00.xml`;
  return fetchXml(url, {
    source: '海外安全情報',
    timeout: 45000,
    cacheTtl: params.countryCode || params.regionCode ? CacheTTL.DATA : CacheTTL.MASTER,
  });
}
