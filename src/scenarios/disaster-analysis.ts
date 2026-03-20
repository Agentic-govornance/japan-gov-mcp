/**
 * 地域防災リスク評価シナリオ
 * 住所→座標変換 + 地震ハザード + 浸水深 + 河川水位
 */

import type { ApiResponse } from '../utils/http.js';
import { createError } from '../utils/http.js';
import { geocode } from '../providers/geo.js';
import { getSeismicHazard } from '../providers/weather.js';
import { getFloodDepth } from '../providers/disaster.js';

/**
 * 地域防災リスク評価
 */
export async function disasterRiskAssessment(params: {
  address?: string;
  lat?: number;
  lon?: number;
}): Promise<ApiResponse<unknown>> {
  const source = 'Scenario/disaster_risk_assessment';

  let lat = params.lat;
  let lon = params.lon;

  // 住所→座標変換
  if (!lat || !lon) {
    if (!params.address?.trim()) {
      return createError(source, 'Either address or lat/lon coordinates is required');
    }
    const geoResult = await geocode({ address: params.address });
    if (!geoResult.success || !geoResult.data) {
      return createError(source, `Geocoding failed: ${geoResult.error || 'no results'}`);
    }
    // GSIジオコーダーは配列を返す
    const features = geoResult.data as Array<{ geometry: { coordinates: number[] } }>;
    if (Array.isArray(features) && features.length > 0) {
      const coords = features[0].geometry?.coordinates;
      if (coords) {
        lon = coords[0];
        lat = coords[1];
      }
    }
    if (!lat || !lon) {
      return createError(source, 'Could not resolve address to coordinates');
    }
  }

  try {
    const [seismicResult, floodResult] = await Promise.allSettled([
      getSeismicHazard({ lat, lon }),
      getFloodDepth({ lat, lon }),
    ]);

    const extract = (r: PromiseSettledResult<ApiResponse>) =>
      r.status === 'fulfilled' && r.value.success
        ? r.value.data
        : { error: r.status === 'rejected' ? String(r.reason) : (r.value as ApiResponse).error };

    return {
      success: true,
      data: {
        location: { address: params.address, lat, lon },
        seismicHazard: extract(seismicResult),
        floodRisk: extract(floodResult),
      },
      source,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return createError(source, error instanceof Error ? error.message : String(error));
  }
}
