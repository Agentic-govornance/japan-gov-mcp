/**
 * 法人番号システム Web-API Provider
 * 国税庁 - 法人番号公表サイト
 * https://www.houjin-bangou.nta.go.jp/webapi/
 *
 * 法人番号、商号、所在地の検索・取得
 * API Version: 4
 */

import { fetchXml, buildUrl, createError } from '../utils/http.js';

const BASE_URL = 'https://api.houjin-bangou.nta.go.jp/4';

export interface HoujinConfig {
  appId: string;
}

/** 法人番号指定検索 or 法人名称検索 */
export async function searchHoujin(config: HoujinConfig, params: {
  name?: string;
  number?: string;
  address?: string;
  kind?: string;
  history?: boolean;
  from?: string;
  to?: string;
  type?: string;
  divide?: number;
}) {
  if (!config.appId?.trim()) {
    return createError('法人番号/search', 'appId is required');
  }
  if (params.number) {
    const url = buildUrl(`${BASE_URL}/num`, {
      id: config.appId,
      number: params.number,
      type: params.type || '12',
      history: params.history ? '1' : '0',
    });
    return fetchXml(url, { source: '法人番号/num' });
  }
  if (!params.name && !params.address) {
    return createError('法人番号/name', 'name or address is required');
  }
  const url = buildUrl(`${BASE_URL}/name`, {
    id: config.appId,
    name: params.name,
    address: params.address,
    kind: params.kind,
    from: params.from,
    to: params.to,
    type: params.type || '12',
    divide: params.divide || 1,
  });
  return fetchXml(url, { source: '法人番号/name' });
}
