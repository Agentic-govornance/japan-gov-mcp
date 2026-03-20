/**
 * 共通HTTPユーティリティ
 * 全Providerが使用する統一的なHTTPクライアント
 */

/** データ品質メタデータ */
export interface DataQualityMeta {
  /** 指標コードと単位のマッピング */
  units?: Record<string, string>;
  /** 調査年情報 */
  surveyYear?: string;
  /** 調査名 */
  surveyName?: string;
  /** 秘匿フラグ（データが秘匿されている指標） */
  suppressed?: string[];
  /** 合併警告 */
  mergerWarnings?: { code: string; name: string; message: string }[];
  /** データ制約・注記 */
  notes?: string[];
}

/** 全APIレスポンスの統一型 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  timestamp: string;
  cached?: boolean;
  /** データ品質メタデータ（単位・調査年・秘匿フラグ・合併警告等） */
  meta?: DataQualityMeta;
}

/** エラーレスポンスを生成する共通ヘルパー */
export function createError<T = never>(source: string, error: string): ApiResponse<T> {
  return {
    success: false,
    error,
    source,
    timestamp: new Date().toISOString(),
  };
}

/** 必須文字列パラメータの検証 */
export function ensureRequired(value: string | undefined, name: string, source: string): ApiResponse<never> | undefined {
  if (!value?.trim()) {
    return createError(source, `${name} is required`);
  }
  return undefined;
}

/** 数値範囲の検証 */
export function ensureRange(
  value: number | undefined,
  name: string,
  source: string,
  min: number,
  max: number,
): ApiResponse<never> | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < min || value > max) {
    return createError(source, `${name} must be an integer between ${min} and ${max}`);
  }
  return undefined;
}

// ═══════════════════════════════════════════════
// In-memory LRU Cache with TTL
// ═══════════════════════════════════════════════

interface CacheEntry {
  response: ApiResponse;
  expiresAt: number;
}

const DEFAULT_MAX_ENTRIES = 256;

class LruCache {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get(key: string): ApiResponse | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    // Deep clone to prevent mutation of cached data
    return { ...structuredClone(entry.response), cached: true };
  }

  set(key: string, response: ApiResponse, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, { response, expiresAt: Date.now() + ttlMs });
  }

  get size() { return this.cache.size; }

  clear(): void { this.cache.clear(); }
}

/** グローバルキャッシュインスタンス */
export const cache = new LruCache();

/** キャッシュTTL定数 */
export const CacheTTL = {
  /** マスタデータ（都道府県一覧等）: 1時間 */
  MASTER: 60 * 60 * 1000,
  /** 統計データ: 5分 */
  DATA: 5 * 60 * 1000,
  /** 検索結果: 2分 */
  SEARCH: 2 * 60 * 1000,
} as const;

// ═══════════════════════════════════════════════
// Rate Limiter — Token Bucket (per host)
// ═══════════════════════════════════════════════

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(maxTokens: number, refillPerSecond: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  /** トークンを1つ取得。不足時は待機 */
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

const DEFAULT_RATE = 5; // 5 requests/sec per host
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/** ホスト別レートリミッターレジストリ */
export const rateLimiters = new Map<string, TokenBucket>();

/** ホスト別のレートリミッターを取得 */
function getRateLimiter(url: string): TokenBucket {
  const host = new URL(url).host;
  let limiter = rateLimiters.get(host);
  if (!limiter) {
    limiter = new TokenBucket(DEFAULT_RATE, DEFAULT_RATE);
    rateLimiters.set(host, limiter);
  }
  return limiter;
}

/** レートリミット + 429リトライ付きfetch */
async function fetchWithRateLimit(
  url: string,
  init: RequestInit,
  source: string,
): Promise<Response> {
  const limiter = getRateLimiter(url);
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await limiter.acquire();
    const res = await fetch(url, init);

    if (res.status !== 429) return res;

    lastResponse = res;
    if (attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get('Retry-After');
      const parsedRetry = retryAfter ? parseInt(retryAfter, 10) : NaN;
      const waitMs = Number.isFinite(parsedRetry) && parsedRetry > 0
        ? parsedRetry * 1000
        : INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      console.error(`[${source}] 429 Rate Limited, retry ${attempt + 1}/${MAX_RETRIES} after ${waitMs}ms`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  return lastResponse!;
}

// ═══════════════════════════════════════════════
// HTTP Fetch Functions
// ═══════════════════════════════════════════════

interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
  source: string;
  /** キャッシュTTL(ms)。0 or undefinedでキャッシュ無効 */
  cacheTtl?: number;
}

/**
 * JSON APIを呼び出す
 * @param url - リクエストURL
 * @param options - ヘッダー、タイムアウト、ソース名、キャッシュTTL
 */
export async function fetchJson<T = any>(
  url: string,
  options: FetchOptions
): Promise<ApiResponse<T>> {
  // Cache key includes auth headers to prevent cross-user cache hits
  const cacheKey = options.headers
    ? `${url}|${Object.entries(options.headers).sort().map(([k,v]) => `${k}=${v}`).join('&')}`
    : url;

  // Check cache
  if (options.cacheTtl) {
    const cached = cache.get(cacheKey);
    if (cached) return cached as ApiResponse<T>;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const res = await fetchWithRateLimit(url, {
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    }, options.source);

    if (!res.ok) {
      return createError(options.source, `HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    if (!text.trim()) {
      return createError(options.source, 'Empty response body');
    }
    const data = JSON.parse(text) as T;
    const response: ApiResponse<T> = {
      success: true,
      data,
      source: options.source,
      timestamp: new Date().toISOString(),
    };

    // Store in cache if TTL specified
    if (options.cacheTtl) {
      cache.set(cacheKey, response, options.cacheTtl);
    }

    return response;
  } catch (err: unknown) {
    return createError(options.source, err instanceof Error ? err.message : 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * XML APIを呼び出す（法令API等で使用）
 */
export async function fetchXml(
  url: string,
  options: FetchOptions
): Promise<ApiResponse<string>> {
  // Check cache
  if (options.cacheTtl) {
    const cached = cache.get(url);
    if (cached) return cached as ApiResponse<string>;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const res = await fetchWithRateLimit(url, {
      headers: {
        'Accept': 'application/xml',
        ...options.headers,
      },
      signal: controller.signal,
    }, options.source);

    if (!res.ok) {
      return createError(options.source, `HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    if (!text.trim()) {
      return createError(options.source, 'Empty XML response body');
    }
    const response: ApiResponse<string> = {
      success: true,
      data: text,
      source: options.source,
      timestamp: new Date().toISOString(),
    };

    if (options.cacheTtl) {
      cache.set(url, response, options.cacheTtl);
    }

    return response;
  } catch (err: unknown) {
    return createError(options.source, err instanceof Error ? err.message : 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * URLビルダー - ベースURLにクエリパラメータを付与
 */
export function buildUrl(base: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// ═══════════════════════════════════════════════
// Input Sanitization Utilities
// ═══════════════════════════════════════════════

/**
 * 文字列サニタイズ — 制御文字・BOM・孤立サロゲート除去、長さ制限
 * 全Providerの入力パラメータに適用推奨
 */
export function sanitizeString(value: string, maxLen: number = 200): string {
  return value
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '')     // 制御文字除去
    .replace(/[\uFEFF]/g, '')              // BOM除去
    .replace(/[\uD800-\uDFFF]/g, '')       // 孤立サロゲート除去
    .slice(0, maxLen);
}

/**
 * 数値クランプ — min/max範囲に制限、undefinedや非有限値にはデフォルト値
 */
export function clampInt(value: number | undefined, min: number, max: number, defaultVal: number): number {
  if (value === undefined || !Number.isFinite(value)) return defaultVal;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * フォーマット検証 — 正規表現パターンに合致しない場合はApiResponseエラーを返す
 */
export function validateFormat(value: string, pattern: RegExp, fieldName: string, source: string): ApiResponse<never> | undefined {
  if (!pattern.test(value)) {
    return createError(source, `${fieldName} format invalid`);
  }
  return undefined;
}
