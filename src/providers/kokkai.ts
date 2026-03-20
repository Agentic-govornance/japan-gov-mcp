/**
 * 国会会議録検索 API Provider
 * 国立国会図書館
 * https://kokkai.ndl.go.jp/api.html
 * APIキー不要
 */

import { fetchJson, buildUrl, createError, ensureRange, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://kokkai.ndl.go.jp/api';

/** 国会会議録 発言検索（本文あり） */
export async function searchKokkaiSpeeches(params: {
  any?: string;
  speaker?: string;
  nameOfHouse?: string;
  nameOfMeeting?: string;
  from?: string;
  until?: string;
  maximumRecords?: number;
  startRecord?: number;
  recordPacking?: string;
}): Promise<ApiResponse> {
  if (params.from && !/^\d{4}-\d{2}-\d{2}$/.test(params.from)) {
    return createError('国会会議録/speech', 'from must be YYYY-MM-DD');
  }
  const url = buildUrl(`${BASE_URL}/speech`, {
    any: params.any,
    speaker: params.speaker,
    nameOfHouse: params.nameOfHouse,
    nameOfMeeting: params.nameOfMeeting,
    from: params.from,
    until: params.until,
    maximumRecords: params.maximumRecords || 20,
    startRecord: params.startRecord || 1,
    recordPacking: params.recordPacking || 'json',
  });
  return fetchJson(url, {
    source: '国会会議録/speech',
    timeout: 45000,
    cacheTtl: CacheTTL.SEARCH,
  });
}

/** 国会会議録 会議一覧検索（本文なし） */
export async function searchKokkaiMeetings(params: {
  any?: string;
  speaker?: string;
  nameOfHouse?: string;
  nameOfMeeting?: string;
  from?: string;
  until?: string;
  maximumRecords?: number;
  startRecord?: number;
  recordPacking?: string;
}): Promise<ApiResponse> {
  const rangeErr = ensureRange(params.maximumRecords, 'maximumRecords', '国会会議録/meeting_list', 1, 1000);
  if (rangeErr) return rangeErr;
  const url = buildUrl(`${BASE_URL}/meeting_list`, {
    any: params.any,
    speaker: params.speaker,
    nameOfHouse: params.nameOfHouse,
    nameOfMeeting: params.nameOfMeeting,
    from: params.from,
    until: params.until,
    maximumRecords: params.maximumRecords || 20,
    startRecord: params.startRecord || 1,
    recordPacking: params.recordPacking || 'json',
  });
  return fetchJson(url, {
    source: '国会会議録/meeting_list',
    timeout: 45000,
    cacheTtl: CacheTTL.SEARCH,
  });
}
