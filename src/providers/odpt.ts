/**
 * ODPT (Open Data for Public Transportation) API Provider - プレースホルダ
 * 公共交通オープンデータ協議会
 * https://developer.odpt.org/
 * APIキー登録待ち
 */

import { createError } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

export interface OdptConfig {
  apiKey: string;
}

/** 鉄道時刻表取得（実装保留中） */
export async function getRailwayTimetable(params: {
  operator?: string;
  railway?: string;
  station?: string;
}, config: OdptConfig): Promise<ApiResponse> {
  if (!config.apiKey?.trim()) {
    return createError('ODPT/railway', 'ODPT_API_KEY is not set. ODPT APIはキー登録待ちのため現在利用できません。');
  }
  return createError('ODPT/railway', 'Not yet implemented - API key registration pending');
}

/** バス時刻表取得（実装保留中） */
export async function getBusTimetable(params: {
  operator?: string;
  busroutePattern?: string;
  busstopPole?: string;
}, config: OdptConfig): Promise<ApiResponse> {
  if (!config.apiKey?.trim()) {
    return createError('ODPT/bus', 'ODPT_API_KEY is not set. ODPT APIはキー登録待ちのため現在利用できません。');
  }
  return createError('ODPT/bus', 'Not yet implemented - API key registration pending');
}
