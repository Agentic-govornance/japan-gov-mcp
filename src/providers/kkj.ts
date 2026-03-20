/**
 * 官公需情報ポータル API Provider
 * 中小企業庁 - 入札・調達案件検索
 * https://www.kkj.go.jp/
 * APIキー不要 (XML/RSS)
 */

import { fetchXml, buildUrl, createError, ensureRange, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://www.kkj.go.jp/api/';

/** 官公需情報 入札・調達案件検索 */
export async function searchKkj(params: {
  Query?: string;
  Project_Name?: string;
  Organization_Name?: string;
  CFT_Issue_Date?: string;
  Tender_Submission_Deadline?: string;
  Area?: string;
  Count?: number;
  Start?: number;
}): Promise<ApiResponse<string>> {
  const source = '官公需情報ポータル/search';
  if (params.CFT_Issue_Date && !/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(params.CFT_Issue_Date)) {
    return createError(source, 'CFT_Issue_Date must be YYYY-MM-DD/YYYY-MM-DD');
  }
  const countErr = ensureRange(params.Count, 'Count', source, 1, 1000);
  if (countErr) return countErr;
  const startErr = ensureRange(params.Start, 'Start', source, 1, 1000000);
  if (startErr) return startErr;
  const url = buildUrl(BASE_URL, {
    Query: params.Query,
    Project_Name: params.Project_Name,
    Organization_Name: params.Organization_Name,
    CFT_Issue_Date: params.CFT_Issue_Date,
    Tender_Submission_Deadline: params.Tender_Submission_Deadline,
    Area: params.Area,
    Count: params.Count || 20,
    Start: params.Start || 1,
  });
  return fetchXml(url, {
    source: '官公需情報ポータル/search',
    cacheTtl: CacheTTL.SEARCH,
    timeout: 60000, // 長めのタイムアウト
  });
}
