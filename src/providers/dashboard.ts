/**
 * 統計ダッシュボード WebAPI Provider (総務省)
 * https://dashboard.e-stat.go.jp/static/api
 * APIキー不要
 */

import { fetchJson, buildUrl, createError } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const DASHBOARD_BASE = 'https://dashboard.e-stat.go.jp/api/1.0';

/** WAF/CDNがUser-Agentなしのリクエストをブロックするため、ブラウザ風ヘッダーを付与 */
const DASHBOARD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export interface DashboardResponse {
  GET_INDICATOR_INFO?: Record<string, unknown>;
  GET_STATS_DATA?: Record<string, unknown>;
  RESULT?: { STATUS: number; ERROR_MSG?: string; DATE?: string };
  [key: string]: unknown;
}

/** 統計指標情報取得 */
export async function getDashboardIndicators(params: {
  indicatorCode?: string;
  lang?: string;
}): Promise<ApiResponse<DashboardResponse>> {
  // NOTE: MetaGetFlg パラメータを含めるとWAF/CDNが404を返すため除外
  const url = buildUrl(`${DASHBOARD_BASE}/Json/getIndicatorInfo`, {
    Lang: params.lang || 'JP',
    IndicatorCode: params.indicatorCode,
  });
  return fetchJson<DashboardResponse>(url, {
    source: '統計ダッシュボード/indicatorInfo',
    timeout: 45000,
    headers: DASHBOARD_HEADERS,
  });
}

/** 統計データ取得 */
export async function getDashboardData(params: {
  indicatorCode: string;
  regionCode?: string;
  timeCdFrom?: string;
  timeCdTo?: string;
  lang?: string;
}): Promise<ApiResponse<DashboardResponse>> {
  if (!params.indicatorCode?.trim()) {
    return createError('統計ダッシュボード/statsData', 'indicatorCode is required');
  }
  // NOTE: TimeCdFrom/TimeCdTo/MetaGetFlg を含めるとWAF/CDNが404を返すため除外
  const url = buildUrl(`${DASHBOARD_BASE}/Json/getData`, {
    Lang: params.lang || 'JP',
    IndicatorCode: params.indicatorCode,
    RegionCode: params.regionCode,
  });
  return fetchJson<DashboardResponse>(url, {
    source: '統計ダッシュボード/statsData',
    timeout: 45000,
    headers: DASHBOARD_HEADERS,
  });
}
