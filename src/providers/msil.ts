/**
 * 海しる (MSIL) API Provider - プレースホルダ
 * 海上保安庁 海洋状況表示システム
 * https://www.msil.go.jp/
 * APIキー登録待ち
 */

import { createError } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

export interface MsilConfig {
  apiKey: string;
}

/** 利用可能レイヤ一覧取得（実装保留中） */
export async function getLayers(config: MsilConfig): Promise<ApiResponse> {
  if (!config.apiKey?.trim()) {
    return createError('海しる/layers', 'MSIL_API_KEY is not set. 海しるAPIはキー登録待ちのため現在利用できません。');
  }
  return createError('海しる/layers', 'Not yet implemented - API key registration pending');
}

/** 指定レイヤのGeoJSON取得（実装保留中） */
export async function getFeatures(params: {
  layerId: string;
  bbox?: string;
}, config: MsilConfig): Promise<ApiResponse> {
  if (!config.apiKey?.trim()) {
    return createError('海しる/features', 'MSIL_API_KEY is not set. 海しるAPIはキー登録待ちのため現在利用できません。');
  }
  if (!params.layerId?.trim()) {
    return createError('海しる/features', 'layerId is required');
  }
  return createError('海しる/features', 'Not yet implemented - API key registration pending');
}
