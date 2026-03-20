/**
 * パブリックコメント API Provider
 * e-Gov パブリックコメント RSS
 * https://public-comment.e-gov.go.jp/
 * APIキー不要
 */

import { fetchXml, createError, CacheTTL } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://public-comment.e-gov.go.jp/servlet/Public';

/** パブリックコメント取得 */
export async function getPublicComments(params?: {
  type?: 'list' | 'result';  // list=意見募集中 result=結果公示
  categoryCode?: string;      // カテゴリコード10桁
}): Promise<ApiResponse<string>> {
  if (params?.categoryCode && !/^\d{10}$/.test(params.categoryCode)) {
    return createError(`パブコメ/${params?.type || 'list'}`, 'categoryCode must be 10 digits');
  }
  const pcType = params?.type || 'list';
  let filename: string;
  if (params?.categoryCode) {
    filename = `pcm_${pcType}_${params.categoryCode}.xml`;
  } else {
    filename = `pcm_${pcType}.xml`;
  }
  return fetchXml(`${BASE_URL}/${filename}`, {
    source: `パブコメ/${pcType}`,
    cacheTtl: CacheTTL.SEARCH,
  });
}
