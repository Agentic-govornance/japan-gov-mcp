/**
 * 防災・災害 API Provider
 * 浸水ナビ + 河川水位 + 道路交通量
 * APIキー不要
 */

import { fetchJson, buildUrl, createError, ensureRequired, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

// ═══════════════════════════════════════════════
// 浸水ナビ (国土地理院)
// https://suiboumap.gsi.go.jp/
// ═══════════════════════════════════════════════

const FLOOD_BASE = 'https://suiboumap.gsi.go.jp';

/** 指定座標の洪水浸水想定深さ・ハザード情報取得 */
export async function getFloodDepth(params: {
  lat: number;
  lon: number;
  groupType?: number; // 0=国管理（デフォルト） 1=県管理
}): Promise<ApiResponse> {
  if (params.lat === undefined || params.lon === undefined) {
    return createError('浸水ナビ/flood', 'lat and lon are required');
  }
  if (!Number.isFinite(params.lat) || params.lat < 24 || params.lat > 46) {
    return createError('浸水ナビ/flood', 'lat must be between 24 and 46');
  }
  if (!Number.isFinite(params.lon) || params.lon < 122 || params.lon > 154) {
    return createError('浸水ナビ/flood', 'lon must be between 122 and 154');
  }
  const url = buildUrl(`${FLOOD_BASE}/shinsuimap/Api/Public/GetFloodDepth`, {
    lat: params.lat,
    lon: params.lon,
    GroupType: params.groupType ?? 0,
  });
  return fetchJson(url, {
    source: '浸水ナビ/flood',
    timeout: 45000,
    cacheTtl: CacheTTL.MASTER,
  });
}

// ═══════════════════════════════════════════════
// 河川水位情報
// https://www.river.go.jp/
// ═══════════════════════════════════════════════

const RIVER_BASE = 'https://www.river.go.jp/kawabou';

/** リアルタイム河川水位情報取得 */
export async function getRiverLevel(params: {
  stationId: string;
}): Promise<ApiResponse> {
  if (!params.stationId?.trim()) {
    return createError('河川水位/level', 'stationId is required');
  }

  // 観測所マスタ情報を取得
  const stationsRes = await fetchJson<{ stations: { station_id: string; name: string }[] }>(
    `${RIVER_BASE}/stations`,
    { source: '河川水位/stations', cacheTtl: CacheTTL.MASTER }
  );

  // 観測データを取得
  const url = buildUrl(`${RIVER_BASE}/observations`, {
    station_id: params.stationId,
  });
  const obsRes = await fetchJson<{ station_id: string; level: number }>(url, {
    source: '河川水位/level',
    cacheTtl: CacheTTL.SEARCH,
  });

  // 統合結果
  const stationInfo = stationsRes.success && Array.isArray((stationsRes.data as any)?.stations)
    ? (stationsRes.data as any).stations.find((s: any) => s.station_id === params.stationId)
    : undefined;

  if (!obsRes.success) return obsRes;

  return {
    success: true,
    data: {
      stationId: params.stationId,
      station: stationInfo ? { name: stationInfo.name } : undefined,
      observation: obsRes.data,
    },
    source: '河川水位/level',
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════
// 道路交通量 (JARTIC WFS)
// ═══════════════════════════════════════════════

const TRAFFIC_BASE = 'https://api.jartic-open-traffic.org/geoserver/wfs';

/** 指定地点周辺の道路交通量データ取得 */
export async function getTrafficVolume(params: {
  lat: number;
  lon: number;
  radius?: number;
  count?: number;
}): Promise<ApiResponse> {
  if (params.lat === undefined || params.lon === undefined) {
    return createError('交通量/volume', 'lat and lon are required');
  }
  if (!Number.isFinite(params.lat) || params.lat < -90 || params.lat > 90) {
    return createError('交通量/volume', 'lat must be between -90 and 90');
  }
  if (!Number.isFinite(params.lon) || params.lon < -180 || params.lon > 180) {
    return createError('交通量/volume', 'lon must be between -180 and 180');
  }
  const r = params.radius || 1000;
  const cqlFilter = `DWITHIN(geom,POINT(${params.lon} ${params.lat}),${r},meters)`;
  const url = buildUrl(TRAFFIC_BASE, {
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'traffic:volume',
    CQL_FILTER: cqlFilter,
    count: params.count || 10,
    outputFormat: 'application/json',
  });
  return fetchJson(url, {
    source: '交通量/volume',
    timeout: 45000,
    cacheTtl: CacheTTL.SEARCH,
  });
}
