/**
 * EDINET API Provider
 * 金融庁 - 有価証券報告書等の開示情報
 * https://disclosure2.edinet-fsa.go.jp/
 *
 * API Version: 2
 */

import { fetchJson, buildUrl, createError } from '../utils/http.js';

const BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';

export interface EdinetConfig {
  apiKey: string;
}

/** 書類一覧取得 - 指定日の開示書類一覧 */
export async function getDocumentList(config: EdinetConfig, params: {
  date: string;         // YYYY-MM-DD
  type?: number;        // 1:メタデータのみ 2:書類一覧+メタデータ
}) {
  if (!config.apiKey?.trim()) {
    return createError('EDINET/documents', 'API key is required');
  }
  if (!params.date || !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    return createError('EDINET/documents', 'date must be YYYY-MM-DD format');
  }
  const url = buildUrl(`${BASE_URL}/documents.json`, {
    date: params.date,
    type: params.type || 2,
  });
  return fetchJson(url, {
    source: 'EDINET/documents',
    headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
  });
}

/** 書類取得 - docIDで個別書類のメタデータ取得 */
export async function getDocument(config: EdinetConfig, params: {
  docId: string;
  type?: number;        // 1:提出本文 2:PDF 3:代替書面 4:英文 5:CSV
}) {
  if (!config.apiKey?.trim()) {
    return createError('EDINET/document', 'API key is required');
  }
  if (!params.docId?.trim()) {
    return createError('EDINET/document', 'docId is required');
  }
  const docType = params.type || 1;
  if (docType >= 2) {
    return createError('EDINET/document', `type=${docType} returns binary data (PDF/ZIP/CSV). Only type=1 (metadata JSON) is supported via this MCP tool.`);
  }
  const url = buildUrl(`${BASE_URL}/documents/${params.docId}`, {
    type: docType,
  });
  return fetchJson(url, {
    source: 'EDINET/document',
    headers: { 'Ocp-Apim-Subscription-Key': config.apiKey },
  });
}
