/**
 * 日本銀行 時系列統計データ API Provider
 * https://www.stat-search.boj.or.jp/
 * APIキー不要（2026/2/18開始）
 */

import { buildUrl, createError, CacheTTL, cache } from '../utils/http.js';
import type { ApiResponse } from '../utils/http.js';

const BASE_URL = 'https://www.stat-search.boj.or.jp/ssi/cgi-bin/famecgi2';

/**
 * CSV行を引用符対応で分割する
 * "field1","field,2",field3 → ["field1", "field,2", "field3"]
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * CSV文字列をJSON配列にパースする
 * "ND" などの非数値は null に変換
 */
function parseCsvToJson(csv: string): Array<Record<string, string | number | null>> {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const rows: Array<Record<string, string | number | null>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, string | number | null> = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = values[j] ?? '';
      // Try to parse as number; non-numeric values like "ND" become null
      const num = Number(raw);
      if (raw === '' || raw === 'ND' || isNaN(num)) {
        // Keep date-like strings as-is, convert known non-data markers to null
        if (j === 0) {
          // First column is typically a date/label — keep as string
          row[headers[j]] = raw;
        } else {
          row[headers[j]] = null;
        }
      } else {
        row[headers[j]] = num;
      }
    }
    rows.push(row);
  }
  return rows;
}

/** 時系列統計データ取得 */
export async function getTimeSeriesData(params: {
  seriesCode: string;
  fromYear?: number;
  toYear?: number;
  frequency?: 'MM' | 'QQ' | 'AA';
  format?: 'CSV' | 'JSON';
}): Promise<ApiResponse> {
  if (!params.seriesCode?.trim()) {
    return createError('日銀/timeseries', 'seriesCode is required');
  }

  const now = new Date().getFullYear();
  const format = params.format || 'JSON';

  const url = buildUrl(BASE_URL, {
    cgi: '$nme_r030_en',
    hdncode: params.seriesCode,
    hdnYyyyFrom: (params.fromYear || now - 10).toString(),
    hdnYyyyTo: (params.toYear || now).toString(),
    chkfrq: params.frequency || 'MM',
  });

  // Check cache
  const cacheKey = `${url}__fmt=${format}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'text/csv' },
      signal: controller.signal,
    });

    if (!res.ok) {
      return createError('日銀/timeseries', `HTTP ${res.status}: ${res.statusText}`);
    }

    // Detect HTML error responses
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await res.text();
      return createError('日銀/timeseries', 'BOJ returned an HTML error page instead of CSV data. The service may be temporarily unavailable.');
    }

    const csvText = await res.text();

    let data: any;
    if (format === 'CSV') {
      data = { csv: csvText };
    } else {
      // JSON format: parse CSV into array
      data = { data: parseCsvToJson(csvText) };
    }

    const response: ApiResponse = {
      success: true,
      data,
      source: '日銀/timeseries',
      timestamp: new Date().toISOString(),
    };

    cache.set(cacheKey, response, CacheTTL.DATA);
    return response;
  } catch (err: unknown) {
    return createError('日銀/timeseries', err instanceof Error ? err.message : 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 主要統計一覧取得 */
export async function getMajorStatistics(): Promise<ApiResponse> {
  const statistics = [
    { code: "MD01'MBASE1", name: 'マネタリーベース', category: 'マネー' },
    { code: "MD02'MAAMAG", name: 'M2（マネーストック）', category: 'マネー' },
    { code: "PR01'PRCPI01", name: '消費者物価指数（総合）', category: '物価' },
    { code: 'FEXXUSJP', name: 'USD/JPY 為替レート', category: '為替' },
    { code: 'FEXXEUJP', name: 'EUR/JPY 為替レート', category: '為替' },
    { code: "IR01'TIRCOM", name: 'コールレート（無担保O/N）', category: '金利' },
    { code: "IR02'TIRCOM10Y", name: '国債10年利回り', category: '金利' },
    { code: "PR02'PRCGPI01", name: '企業物価指数（総平均）', category: '物価' },
  ];

  return {
    success: true,
    data: { statistics },
    source: '日銀/major_statistics',
    timestamp: new Date().toISOString(),
  };
}
