/**
 * e-Stat API Provider
 * 政府統計の総合窓口 - 総務省統計局
 * https://www.e-stat.go.jp/api/
 *
 * 全府省の統計データを横断検索・取得可能
 * API Version: 3.0
 */

import { fetchJson, buildUrl } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://api.e-stat.go.jp/rest/3.0/app/json';

export interface EStatConfig {
  appId: string;
}

type OneOrMany<T> = T | T[];

export interface EStatResult {
  STATUS: number | `${number}`;
  ERROR_MSG?: string;
  DATE?: string;
}

export interface EStatParameter {
  [key: string]: string | number | undefined;
}

export interface EStatStatsListTableInfo {
  '@id': string;
  STAT_NAME?: { '@code'?: string; $?: string };
  GOV_ORG?: { '@code'?: string; $?: string };
  STATISTICS_NAME?: string;
  TITLE?: { '@no'?: string; $?: string };
  CYCLE?: string;
  SURVEY_DATE?: string;
  OPEN_DATE?: string;
  SMALL_AREA?: number | `${number}`;
  MAIN_CATEGORY?: { '@code'?: string; $?: string };
  SUB_CATEGORY?: { '@code'?: string; $?: string };
  OVERALL_TOTAL_NUMBER?: number | `${number}`;
  UPDATED_DATE?: string;
  [key: string]: unknown;
}

export interface EStatStatsListResponse {
  GET_STATS_LIST: {
    RESULT: EStatResult;
    PARAMETER?: EStatParameter;
    DATALIST_INF?: {
      NUMBER?: number | `${number}`;
      RESULT_INF?: {
        FROM_NUMBER?: number | `${number}`;
        TO_NUMBER?: number | `${number}`;
      };
      TABLE_INF?: OneOrMany<EStatStatsListTableInfo>;
    };
  };
}

export interface EStatMetaInfoResponse {
  GET_META_INFO: {
    RESULT: EStatResult;
    PARAMETER?: EStatParameter;
    METADATA_INF?: Record<string, unknown>;
  };
}

export interface EStatStatsDataResponse {
  GET_STATS_DATA: {
    RESULT: EStatResult;
    PARAMETER?: EStatParameter;
    STATISTICAL_DATA?: Record<string, unknown>;
  };
}

export interface EStatDataCatalogResponse {
  GET_DATA_CATALOG: {
    RESULT: EStatResult;
    PARAMETER?: EStatParameter;
    DATA_CATALOG_INF?: Record<string, unknown>;
  };
}

export interface EStatRefineSearchResponse {
  GET_REFINE_SEARCH: {
    RESULT: EStatResult;
    PARAMETER?: EStatParameter;
    REFINE_INF?: Record<string, unknown>;
  };
}

interface EStatEnvelope {
  RESULT?: EStatResult;
}

function createErrorResponse<T>(source: string, error: string): ApiResponse<T> {
  return {
    success: false,
    error,
    source,
    timestamp: new Date().toISOString(),
  };
}

function normalizeStatus(status: EStatResult['STATUS'] | undefined): number | undefined {
  if (status === undefined || status === null) {
    return undefined;
  }

  const numeric = Number(status);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function detectEStatApiError(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return 'Malformed e-Stat response: response body is not an object';
  }

  const root = data as Record<string, unknown>;
  const envelopeKey = Object.keys(root)[0];
  const envelope = root[envelopeKey] as EStatEnvelope | undefined;
  const status = normalizeStatus(envelope?.RESULT?.STATUS);
  if (status === undefined) {
    return 'Malformed e-Stat response: RESULT.STATUS is missing';
  }
  if (status !== 0) {
    const msg = envelope?.RESULT?.ERROR_MSG?.trim() || 'e-Stat API returned an error';
    return `${msg} (STATUS=${status})`;
  }
  return undefined;
}

function ensureAppId(config: EStatConfig, source: string): ApiResponse<never> | undefined {
  if (!config.appId || !config.appId.trim()) {
    return createErrorResponse(source, 'e-Stat appId is required');
  }
  return undefined;
}

function ensureRequired(value: string | undefined, name: string, source: string): ApiResponse<never> | undefined {
  if (!value || !value.trim()) {
    return createErrorResponse(source, `${name} is required`);
  }
  return undefined;
}

function ensureLimit(limit: number | undefined, source: string, max = 100000): ApiResponse<never> | undefined {
  if (limit === undefined) {
    return undefined;
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > max) {
    return createErrorResponse(source, `limit must be an integer between 1 and ${max}`);
  }
  return undefined;
}

async function requestEStat<T>(
  endpoint: string,
  source: string,
  config: EStatConfig,
  params: Record<string, string | number | undefined>
): Promise<ApiResponse<T>> {
  const configError = ensureAppId(config, source);
  if (configError) {
    return configError;
  }

  const url = buildUrl(`${BASE_URL}/${endpoint}`, {
    appId: config.appId,
    ...params,
  });
  const response = await fetchJson<T>(url, { source });
  if (!response.success) {
    return response;
  }

  const apiError = detectEStatApiError(response.data);
  if (apiError) {
    return {
      success: false,
      error: apiError,
      source: response.source,
      timestamp: response.timestamp,
    };
  }

  return response;
}

/** 統計表情報取得 - 条件に合致する統計表の情報を取得 */
export async function getStatsList(config: EStatConfig, params: {
  searchWord?: string;
  surveyYears?: string;
  statsField?: string;
  statsCode?: string;
  searchKind?: string;
  limit?: number;
  startPosition?: number;
  updatedDate?: string;
  lang?: string;
}): Promise<ApiResponse<EStatStatsListResponse>> {
  const limitError = ensureLimit(params.limit, 'e-Stat/getStatsList');
  if (limitError) {
    return limitError;
  }
  return requestEStat<EStatStatsListResponse>('getStatsList', 'e-Stat/getStatsList', config, {
    searchWord: params.searchWord,
    surveyYears: params.surveyYears,
    statsField: params.statsField,
    statsCode: params.statsCode,
    searchKind: params.searchKind,
    limit: params.limit,
    startPosition: params.startPosition,
    updatedDate: params.updatedDate,
    lang: params.lang || 'J',
  });
}

/** メタ情報取得 - 指定した統計表のメタ情報を取得 */
export async function getMetaInfo(config: EStatConfig, params: {
  statsDataId: string;
  lang?: string;
}): Promise<ApiResponse<EStatMetaInfoResponse>> {
  const idError = ensureRequired(params.statsDataId, 'statsDataId', 'e-Stat/getMetaInfo');
  if (idError) {
    return idError;
  }
  return requestEStat<EStatMetaInfoResponse>('getMetaInfo', 'e-Stat/getMetaInfo', config, {
    statsDataId: params.statsDataId,
    lang: params.lang || 'J',
  });
}

/** 統計データ取得 - 指定した統計表のデータを取得 */
export async function getStatsData(config: EStatConfig, params: {
  statsDataId: string;
  lvTab?: string;
  cdTab?: string;
  lvTime?: string;
  cdTime?: string;
  lvArea?: string;
  cdArea?: string;
  lvCat01?: string;
  cdCat01?: string;
  lvCat02?: string;
  cdCat02?: string;
  startPosition?: number;
  limit?: number;
  lang?: string;
  metaGetFlg?: string;
  cntGetFlg?: string;
}): Promise<ApiResponse<EStatStatsDataResponse>> {
  const idError = ensureRequired(params.statsDataId, 'statsDataId', 'e-Stat/getStatsData');
  if (idError) {
    return idError;
  }
  const limitError = ensureLimit(params.limit, 'e-Stat/getStatsData');
  if (limitError) {
    return limitError;
  }
  return requestEStat<EStatStatsDataResponse>('getStatsData', 'e-Stat/getStatsData', config, {
    statsDataId: params.statsDataId,
    lvTab: params.lvTab,
    cdTab: params.cdTab,
    lvTime: params.lvTime,
    cdTime: params.cdTime,
    lvArea: params.lvArea,
    cdArea: params.cdArea,
    lvCat01: params.lvCat01,
    cdCat01: params.cdCat01,
    lvCat02: params.lvCat02,
    cdCat02: params.cdCat02,
    startPosition: params.startPosition,
    limit: params.limit || 100,
    lang: params.lang || 'J',
    metaGetFlg: params.metaGetFlg || 'Y',
    cntGetFlg: params.cntGetFlg || 'N',
  });
}

/** データカタログ情報取得 */
export async function getDataCatalog(config: EStatConfig, params: {
  dataSetId?: string;
  surveyYears?: string;
  statsField?: string;
  statsCode?: string;
  searchWord?: string;
  limit?: number;
  startPosition?: number;
  lang?: string;
}): Promise<ApiResponse<EStatDataCatalogResponse>> {
  const limitError = ensureLimit(params.limit, 'e-Stat/getDataCatalog');
  if (limitError) {
    return limitError;
  }
  return requestEStat<EStatDataCatalogResponse>('getDataCatalog', 'e-Stat/getDataCatalog', config, {
    dataSetId: params.dataSetId,
    surveyYears: params.surveyYears,
    statsField: params.statsField,
    statsCode: params.statsCode,
    searchWord: params.searchWord,
    limit: params.limit,
    startPosition: params.startPosition,
    lang: params.lang || 'J',
  });
}

/** 絞り込み条件取得 - 指定した統計表の絞り込み条件情報を取得 */
export async function refineSearch(config: EStatConfig, params: {
  statsDataId: string;
  cdCat01?: string;
  cdCat02?: string;
  cdArea?: string;
  cdTime?: string;
  lang?: string;
}): Promise<ApiResponse<EStatRefineSearchResponse>> {
  const idError = ensureRequired(params.statsDataId, 'statsDataId', 'e-Stat/refineSearch');
  if (idError) {
    return idError;
  }
  return requestEStat<EStatRefineSearchResponse>('refineSearch', 'e-Stat/refineSearch', config, {
    statsDataId: params.statsDataId,
    cdCat01: params.cdCat01,
    cdCat02: params.cdCat02,
    cdArea: params.cdArea,
    cdTime: params.cdTime,
    lang: params.lang || 'J',
  });
}
