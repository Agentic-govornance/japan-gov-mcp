/**
 * 気象・防災 API Provider
 * 気象庁防災情報 + J-SHIS地震ハザード + AMeDAS + 地震・津波情報
 * APIキー不要
 */

import { fetchJson, buildUrl, createError, ensureRequired, ensureRange, validateFormat, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

// ═══════════════════════════════════════════════
// 気象庁天気予報 - APIキー不要
// https://www.jma.go.jp/bosai/forecast/
// ═══════════════════════════════════════════════

const JMA_BASE = 'https://www.jma.go.jp/bosai';

/** 天気予報取得 */
export async function getForecast(params: {
  areaCode: string;
}): Promise<ApiResponse> {
  const req = ensureRequired(params.areaCode, 'areaCode', '気象庁/forecast');
  if (req) return req;
  const fmt = validateFormat(params.areaCode.trim(), /^\d{6}$/, 'areaCode', '気象庁/forecast');
  if (fmt) return createError('気象庁/forecast', 'areaCode must be a 6-digit numeric code');
  return fetchJson(`${JMA_BASE}/forecast/data/forecast/${params.areaCode}.json`, {
    source: '気象庁/forecast',
    cacheTtl: CacheTTL.DATA,
  });
}

/** 天気概況取得 */
export async function getForecastOverview(params: {
  areaCode: string;
}): Promise<ApiResponse> {
  if (!params.areaCode?.trim()) {
    return createError('気象庁/overview', 'areaCode is required');
  }
  if (!/^\d{6}$/.test(params.areaCode.trim())) {
    return createError('気象庁/overview', 'areaCode must be a 6-digit numeric code');
  }
  return fetchJson(`${JMA_BASE}/forecast/data/overview_forecast/${params.areaCode}.json`, {
    source: '気象庁/overview',
    cacheTtl: CacheTTL.DATA,
  });
}

/** 週間天気予報取得 */
export async function getForecastWeekly(params: {
  areaCode: string;
}): Promise<ApiResponse> {
  const req = ensureRequired(params.areaCode, 'areaCode', '気象庁/weekly');
  if (req) return req;
  const fmt = validateFormat(params.areaCode.trim(), /^\d{6}$/, 'areaCode', '気象庁/weekly');
  if (fmt) return createError('気象庁/weekly', 'areaCode must be a 6-digit numeric code');
  return fetchJson(`${JMA_BASE}/forecast/data/overview_week/${params.areaCode}.json`, {
    source: '気象庁/weekly',
    cacheTtl: CacheTTL.DATA,
  });
}

/** 台風情報取得 */
export async function getTyphoonInfo(): Promise<ApiResponse> {
  return fetchJson(`${JMA_BASE}/typhoon/data/tinfo.json`, {
    source: '気象庁/typhoon',
    cacheTtl: CacheTTL.SEARCH,
  });
}

/** 地震情報一覧取得 */
export async function getEarthquakeList(): Promise<ApiResponse> {
  return fetchJson(`${JMA_BASE}/quake/data/list.json`, {
    source: '気象庁/earthquake',
    cacheTtl: CacheTTL.SEARCH,
  });
}

/** 津波情報・警報一覧取得 */
export async function getTsunamiList(): Promise<ApiResponse> {
  return fetchJson(`${JMA_BASE}/tsunami/data/list.json`, {
    source: '気象庁/tsunami',
    cacheTtl: CacheTTL.SEARCH,
  });
}

// ═══════════════════════════════════════════════
// AMeDAS (気象庁) - APIキー不要
// ═══════════════════════════════════════════════

/** アメダス全観測所一覧 */
export async function getAmedasStations(): Promise<ApiResponse> {
  return fetchJson(`${JMA_BASE}/amedas/const/amedastable.json`, {
    source: '気象庁/amedas_stations',
    cacheTtl: CacheTTL.MASTER,
  });
}

/** アメダス観測データ取得 */
export async function getAmedasData(params: {
  pointId: string;
  date?: string;  // YYYYMMDDHH
}): Promise<ApiResponse> {
  if (!params.pointId?.trim()) {
    return createError('気象庁/amedas_data', 'pointId is required');
  }
  if (!/^\d{5}$/.test(params.pointId.trim())) {
    return createError('気象庁/amedas_data', 'pointId must be a 5-digit numeric code (e.g. 44132)');
  }

  // 日付フォーマット検証
  if (params.date) {
    const dateFmt = validateFormat(params.date, /^\d{10}$/, 'date', '気象庁/amedas_data');
    if (dateFmt) return createError('気象庁/amedas_data', 'date must be YYYYMMDDHH format (10 digits)');
  }

  // 最新データの場合は latest_time.txt から日時を取得
  if (!params.date) {
    let dateStr: string;
    try {
      const res = await fetch(`${JMA_BASE}/amedas/data/latest_time.txt`);
      if (!res.ok) {
        return createError('気象庁/amedas_data', `Failed to fetch latest time: HTTP ${res.status}`);
      }
      const ltStr = (await res.text()).trim();
      // Extract YYYYMMDDHH from ISO format "YYYY-MM-DDTHH:..."
      dateStr = ltStr.slice(0, 10).replace(/-/g, '') + ltStr.slice(11, 13);
    } catch {
      return createError('気象庁/amedas_data', 'Failed to fetch latest time');
    }
    return fetchJson(`${JMA_BASE}/amedas/data/point/${params.pointId}/${dateStr}.json`, {
      source: '気象庁/amedas_data',
      cacheTtl: CacheTTL.SEARCH,
    });
  }

  // 指定日時データ (YYYYMMDDHH format)
  return fetchJson(`${JMA_BASE}/amedas/data/point/${params.pointId}/${params.date}.json`, {
    source: '気象庁/amedas_data',
    cacheTtl: CacheTTL.DATA,
  });
}

// ═══════════════════════════════════════════════
// J-SHIS 地震ハザードステーション (防災科研) - APIキー不要
// https://www.j-shis.bosai.go.jp/
// ═══════════════════════════════════════════════

const JSHIS_BASE = 'https://www.j-shis.bosai.go.jp/map/api';

/** 地震ハザード情報取得 */
export async function getSeismicHazard(params: {
  lat: number;
  lon: number;
}): Promise<ApiResponse> {
  if (params.lat === undefined || params.lon === undefined) {
    return createError('J-SHIS/hazard', 'lat and lon are required');
  }
  if (!Number.isFinite(params.lat) || params.lat < -90 || params.lat > 90) {
    return createError('J-SHIS/hazard', 'lat must be between -90 and 90');
  }
  if (!Number.isFinite(params.lon) || params.lon < -180 || params.lon > 180) {
    return createError('J-SHIS/hazard', 'lon must be between -180 and 180');
  }
  const url = buildUrl(`${JSHIS_BASE}/pshm/Y2024/AVR/TTL_MTTL/meshinfo.geojson`, {
    position: `${params.lon},${params.lat}`,
    epsg: 4326,
  });
  return fetchJson(url, {
    source: 'J-SHIS/hazard',
    cacheTtl: CacheTTL.MASTER,
  });
}
