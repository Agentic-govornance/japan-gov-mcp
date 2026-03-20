/**
 * NDB OpenData Hub API Provider
 * 厚生労働省 NDB（ナショナルデータベース）オープンデータ
 * https://ndbopendata-hub.com/
 *
 * 特定健診の検査データ・質問票データを地域・属性で絞り込み・比較
 * APIキー不要、無料利用可能
 */

import { fetchJson, buildUrl, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://ndbopendata-hub.com/api/v1';

/**
 * NDB検査統計データ取得
 * @param params - 検索条件
 */
export async function getInspectionStats(params: {
  itemName: string;           // 必須: 検査項目名（例: "BMI", "収縮期血圧"）
  recordMode?: string;        // basic/detailed/all (デフォルト: basic)
  areaType?: string;          // prefecture (都道府県) or secondary_medical_area (二次医療圏)
  prefectureName?: string;    // 都道府県名
  areaName?: string;          // 二次医療圏名
  gender?: string;            // M/F/all
  ageGroup?: string;          // 40-44, 45-49, ...
  valueRange?: string;        // 検査値範囲
  page?: number;
  perPage?: number;
  format?: 'json' | 'summary' | 'markdown_table';
}): Promise<ApiResponse<unknown>> {
  const source = 'NDB/inspection_stats';

  if (!params.itemName?.trim()) {
    return createError(source, 'itemName is required');
  }

  const url = buildUrl(`${BASE_URL}/inspection-stats`, {
    item_name: params.itemName.trim(),
    record_mode: params.recordMode || 'inspection',
    area_type: params.areaType,
    prefecture_name: params.prefectureName,
    area_name: params.areaName,
    gender: params.gender,  // M/F/all
    age_group: params.ageGroup,
    value_range: params.valueRange,
    page: params.page,
    per_page: params.perPage,
    format: params.format || 'json',
  });

  return fetchJson<unknown>(url, {
    source,
    timeout: 45000,
    cacheTtl: CacheTTL.DATA, // 統計データは中期キャッシュ
  });
}

/**
 * 検査項目一覧取得
 */
export async function getItems(params?: {
  dataset?: string; // 'inspection' (デフォルト)
}): Promise<ApiResponse<unknown>> {
  const url = buildUrl(`${BASE_URL}/items`, {
    dataset: params?.dataset || 'inspection',
  });

  return fetchJson<unknown>(url, {
    source: 'NDB/items',
    cacheTtl: CacheTTL.MASTER, // マスタデータは長期キャッシュ
  });
}

/**
 * 地域一覧取得（都道府県 or 二次医療圏）
 */
export async function getAreas(params?: {
  type?: 'prefecture' | 'secondary_medical_area';
}): Promise<ApiResponse<unknown>> {
  const url = buildUrl(`${BASE_URL}/areas`, {
    type: params?.type || 'prefecture',
  });

  return fetchJson<unknown>(url, {
    source: 'NDB/areas',
    cacheTtl: CacheTTL.MASTER,
  });
}

/**
 * 検査項目の値範囲ラベル取得
 */
export async function getRangeLabels(params: {
  itemName: string;
  recordMode?: string;
  gender?: string;
}): Promise<ApiResponse<unknown>> {
  const source = 'NDB/range_labels';

  if (!params.itemName?.trim()) {
    return createError(source, 'itemName is required');
  }

  const url = buildUrl(`${BASE_URL}/range-labels`, {
    item_name: params.itemName.trim(),
    record_mode: params.recordMode || 'inspection',
    gender: params.gender,  // M/F/all
  });

  return fetchJson<unknown>(url, {
    source,
    timeout: 45000,
    cacheTtl: CacheTTL.MASTER,
  });
}

/**
 * API稼働状態確認
 */
export async function getHealth(): Promise<ApiResponse<unknown>> {
  return fetchJson<unknown>(`${BASE_URL}/health`, {
    source: 'NDB/health',
    cacheTtl: 0, // ヘルスチェックはキャッシュしない
  });
}

/**
 * NDB Hub 外部MCPプロキシ
 * NDB OpenData Hub の独自エンドポイントに自然言語クエリを送信
 */
export async function ndbHubProxy(params: {
  query: string;
  prefectureCode?: string;
  indicator?: string;
  gender?: string;
  ageClass?: string;
}): Promise<ApiResponse<unknown>> {
  if (!params.query?.trim()) {
    return createError('NDB Hub/proxy', 'query is required');
  }
  const url = buildUrl(`${BASE_URL}/proxy`, {
    q: params.query,
    prefecture_code: params.prefectureCode,
    indicator: params.indicator,
    gender: params.gender,
    age_class: params.ageClass,
  });
  return fetchJson<unknown>(url, {
    source: 'NDB Hub/proxy',
    cacheTtl: CacheTTL.SEARCH,
  });
}
