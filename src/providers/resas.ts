/**
 * RESAS API Provider
 * 地域経済分析システム - 内閣府/経済産業省
 * https://opendata.resas-portal.go.jp/
 *
 * ⚠️ RESAS APIは2025-03-24に提供終了
 * 代替: e-Stat, 統計ダッシュボード, 国交省DPF
 */

import { createError } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

export interface ResasConfig {
  apiKey: string;
}

function deprecatedError(toolName: string, alternatives: string): ApiResponse {
  return createError(
    `RESAS/${toolName}`,
    `RESAS APIは2025-03-24に提供終了しました。代替: ${alternatives}`
  );
}

export async function getPrefectures(_config: ResasConfig): Promise<ApiResponse> {
  return deprecatedError('prefectures', 'estat_search（地域統計）または dashboard_data（統計ダッシュボード）');
}

export async function getCities(_config: ResasConfig, _params: { prefCode: number }): Promise<ApiResponse> {
  return deprecatedError('cities', 'estat_search（市区町村別統計）または mlit_dpf_search（地域データ）');
}

export async function getPopulation(_config: ResasConfig, _params: {
  prefCode: number; cityCode: string;
}): Promise<ApiResponse> {
  return deprecatedError('population', 'estat_search（人口統計・統計コード00200521）または dashboard_data（人口系指標）');
}

export async function getPopulationPyramid(_config: ResasConfig, _params: {
  prefCode: number; cityCode: string; yearLeft: number; yearRight: number;
}): Promise<ApiResponse> {
  return deprecatedError('populationPyramid', 'estat_search（国勢調査・統計コード00200521）');
}

export async function getIndustryPower(_config: ResasConfig, _params: {
  prefCode: number; cityCode: string; sicCode: string; simcCode: string;
}): Promise<ApiResponse> {
  return deprecatedError('industryPower', 'estat_search（経済センサス・工業統計）または mlit_dpf_search（産業データ）');
}

export async function getTourismForeigners(_config: ResasConfig, _params: {
  prefCode: number; purpose?: number;
}): Promise<ApiResponse> {
  return deprecatedError('tourismForeigners', 'estat_search（観光統計）または japansearch_search（文化観光情報）');
}

export async function getMunicipalFinance(_config: ResasConfig, _params: {
  prefCode: number; cityCode: string; matter: number;
}): Promise<ApiResponse> {
  return deprecatedError('municipalFinance', 'dashboard_data（地方財政指標）または estat_search（地方財政統計）');
}

export async function getPatents(_config: ResasConfig, _params: {
  prefCode: number; cityCode: string;
}): Promise<ApiResponse> {
  return deprecatedError('patents', 'jstage_search（学術特許検索）または cinii_search（CiNii特許情報）');
}

export async function getAgriCrops(_config: ResasConfig, _params: {
  prefCode: number; cityCode: string;
}): Promise<ApiResponse> {
  return deprecatedError('agriCrops', 'estat_search（農業統計）または agriknowledge_search（農研機構）');
}
