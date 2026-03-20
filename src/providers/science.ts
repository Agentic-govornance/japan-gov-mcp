/**
 * 科学・環境 API Provider
 * そらまめくん + シームレス地質図 + JAXA G-Portal
 * APIキー不要
 */

import { fetchJson, buildUrl, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

// ═══════════════════════════════════════════════
// そらまめくん (環境省 大気汚染物質広域監視システム)
// https://soramame.env.go.jp/
// ═══════════════════════════════════════════════

const SORAMAME_CSV_URL = 'https://soramame.env.go.jp/data/map/kyokuNoudo/latest.csv';

/**
 * CSV文字列をオブジェクト配列にパースする
 * ヘッダー行をキーとして各行をオブジェクトに変換
 */
function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

/** 大気汚染リアルタイムデータ取得（CSV） */
export async function getAirQuality(params: {
  stationCode?: string;
}): Promise<ApiResponse> {
  if (params.stationCode !== undefined && !params.stationCode.trim()) {
    return createError('そらまめくん/air_quality', 'stationCode must not be empty');
  }

  const source = 'そらまめくん/air_quality';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(SORAMAME_CSV_URL, { signal: controller.signal });
    if (!res.ok) {
      return createError(source, `HTTP ${res.status}: ${res.statusText}`);
    }
    const csvText = await res.text();
    let stations = parseCsv(csvText);

    // Client-side filtering by stationCode
    if (params.stationCode) {
      stations = stations.filter(
        (s) => s['測定局コード'] === params.stationCode,
      );
    }

    return {
      success: true,
      data: { stations, count: stations.length },
      source,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    return createError(source, err instanceof Error ? err.message : 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

// ═══════════════════════════════════════════════
// シームレス地質図 (産総研/GSJ)
// https://gbank.gsj.jp/seamless/
// ═══════════════════════════════════════════════

const GEOLOGY_BASE = 'https://gbank.gsj.jp/seamless/v2';

/** 地質図凡例一覧 */
export async function getGeologyLegend(): Promise<ApiResponse> {
  return fetchJson(`${GEOLOGY_BASE}/api/1.2/legend.json`, {
    source: '地質図/legend',
    cacheTtl: CacheTTL.MASTER,
  });
}

/** 指定地点の地質情報取得 */
export async function getGeologyAtPoint(params: {
  lat: number;
  lon: number;
}): Promise<ApiResponse> {
  if (!Number.isFinite(params.lat) || !Number.isFinite(params.lon)) {
    return createError('地質図/at_point', 'lat and lon must be finite numbers');
  }
  if (params.lat < -90 || params.lat > 90) {
    return createError('地質図/at_point', 'lat must be between -90 and 90');
  }
  if (params.lon < -180 || params.lon > 180) {
    return createError('地質図/at_point', 'lon must be between -180 and 180');
  }

  const url = buildUrl(`${GEOLOGY_BASE}/api/1.2/legend.json`, {
    point: `${params.lat},${params.lon}`,
  });
  return fetchJson(url, {
    source: '地質図/at_point',
    cacheTtl: CacheTTL.MASTER,
  });
}

// ═══════════════════════════════════════════════
// JAXA G-Portal / Earth API
// https://gportal.jaxa.jp/
// ═══════════════════════════════════════════════

const JAXA_BASE = 'https://gportal.jaxa.jp/stac/cog/v1';

/** JAXA衛星データコレクション一覧（STACカタログ） */
export async function getJaxaCollections(params: {
  limit?: number;
}): Promise<ApiResponse> {
  const source = 'JAXA/collections';
  const url = `${JAXA_BASE}/catalog.json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return createError(source, `HTTP ${res.status}: ${res.statusText}`);
    }
    const catalog = await res.json() as {
      links?: Array<{ rel: string; href: string; title?: string }>;
    };

    // Extract child links as collections
    const childLinks = (catalog.links ?? []).filter(
      (link) => link.rel === 'child',
    );

    const limit = params.limit ?? childLinks.length;
    const collections = childLinks.slice(0, limit);

    return {
      success: true,
      data: {
        total: childLinks.length,
        returned: collections.length,
        collections,
      },
      source,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    return createError(source, err instanceof Error ? err.message : 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}
