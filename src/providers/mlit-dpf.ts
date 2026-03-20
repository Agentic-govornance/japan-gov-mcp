/**
 * 国交省データプラットフォーム API Provider
 * https://www.mlit-data.jp/
 * APIキー必要 / GraphQL API
 */

import { createError, ensureRange, CacheTTL, cache } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const ENDPOINT = 'https://www.mlit-data.jp/api/v1/';

export interface MlitDpfConfig {
  apiKey: string;
}

/** GraphQL POST helper */
async function graphqlPost(
  config: MlitDpfConfig,
  query: string,
  variables: Record<string, unknown> | undefined,
  source: string,
  cacheTtl?: number,
): Promise<ApiResponse> {
  // Check cache
  const cacheKey = `${ENDPOINT}:${query}:${JSON.stringify(variables || {})}`;
  if (cacheTtl) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return createError(source, `HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data?.errors && data.errors.length > 0) {
      return createError(source, `GraphQL error: ${data.errors[0]?.message || 'Unknown error'}`);
    }
    const response: ApiResponse = {
      success: true,
      data: data?.data,
      source,
      timestamp: new Date().toISOString(),
    };

    if (cacheTtl) {
      cache.set(cacheKey, response, cacheTtl);
    }

    return response;
  } catch (err: unknown) {
    return createError(source, err instanceof Error ? err.message : 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

/** インフラデータ横断検索 */
export async function searchMlitDpf(config: MlitDpfConfig, params: {
  term: string;
  first?: number;
  size?: number;
}): Promise<ApiResponse> {
  if (!config.apiKey?.trim()) {
    return createError('国交省DPF/search', 'MLIT_DPF_API_KEY is required');
  }
  if (!params.term?.trim()) {
    return createError('国交省DPF/search', 'term is required');
  }
  const sizeErr = ensureRange(params.size, 'size', '国交省DPF/search', 1, 100);
  if (sizeErr) return sizeErr;

  const first = params.first ?? 0;
  const size = params.size ?? 10;
  const query = `query($term: String!, $first: Int, $size: Int) { search(term: $term, first: $first, size: $size) { totalNumber searchResults { id title } } }`;

  return graphqlPost(config, query, { term: params.term, first, size }, '国交省DPF/search', CacheTTL.SEARCH);
}

/** データカタログ詳細取得 */
export async function getMlitDpfCatalog(config: MlitDpfConfig, params: {
  id: string;
}): Promise<ApiResponse> {
  if (!config.apiKey?.trim()) {
    return createError('国交省DPF/catalog', 'MLIT_DPF_API_KEY is required');
  }
  if (!params.id?.trim()) {
    return createError('国交省DPF/catalog', 'id is required');
  }

  const query = `query($id: String!) { dataCatalog(IDs: $id) { id title description modified } }`;

  return graphqlPost(config, query, { id: params.id }, '国交省DPF/catalog', CacheTTL.DATA);
}
