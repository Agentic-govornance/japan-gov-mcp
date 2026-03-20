/**
 * BOJ (Bank of Japan) Time-Series Data API Tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getTimeSeriesData,
  getMajorStatistics,
} from '../build/providers/boj.js';
import { setupFetchMock, mockCsvResponse, mockHtmlResponse } from './helpers.ts';

setupFetchMock();

describe('BOJ Time-Series Data API', () => {
  it('getTimeSeriesData should fetch CSV data with seriesCode', async () => {
    const csvData = 'Date,Value\n2024-01,100.5\n2024-02,101.2\n2024-03,ND';

    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://www.stat-search.boj.or.jp');
      assert.equal(url.pathname, '/ssi/cgi-bin/famecgi2');
      assert.equal(url.searchParams.get('cgi'), '$nme_r030_en');
      assert.equal(url.searchParams.get('hdncode'), 'TEST123');
      assert.equal(url.searchParams.get('chkfrq'), 'MM');
      return mockCsvResponse(csvData);
    };

    const result = await getTimeSeriesData({ seriesCode: 'TEST123' });
    assert.equal(result.success, true);
    assert.ok(result.data);
  });

  it('getTimeSeriesData should fail when seriesCode is empty', async () => {
    const result = await getTimeSeriesData({ seriesCode: '  ' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /seriesCode is required/);
  });

  it('getTimeSeriesData should convert CSV to JSON when format=JSON', async () => {
    const csvData = 'Date,Value\n2024-01,100.5\n2024-02,101.2\n2024-03,ND';

    globalThis.fetch = async () => mockCsvResponse(csvData);

    const result = await getTimeSeriesData({ seriesCode: 'TEST123', format: 'JSON' });
    assert.equal(result.success, true);
    const data = result.data as { data?: Array<{ Date: string; Value: number | null }> };
    assert.ok(Array.isArray(data.data));
    assert.equal(data.data?.length, 3);
    assert.equal(data.data?.[0].Date, '2024-01');
    assert.equal(data.data?.[0].Value, 100.5);
    assert.equal(data.data?.[2].Value, null); // "ND" → null
  });

  it('getTimeSeriesData should return CSV text when format=CSV', async () => {
    const csvData = 'Date,Value\n2024-01,100.5\n2024-02,101.2';

    globalThis.fetch = async () => mockCsvResponse(csvData);

    const result = await getTimeSeriesData({ seriesCode: 'TEST123', format: 'CSV' });
    assert.equal(result.success, true);
    const data = result.data as { csv?: string };
    assert.ok(data.csv?.includes('Date,Value'));
  });

  it('getTimeSeriesData should send custom date range', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('hdnYyyyFrom'), '2020');
      assert.equal(url.searchParams.get('hdnYyyyTo'), '2023');
      return mockCsvResponse('Date,Value\n2020-01,100');
    };

    const result = await getTimeSeriesData({
      seriesCode: 'TEST123',
      fromYear: 2020,
      toYear: 2023,
    });
    assert.equal(result.success, true);
  });

  it('getTimeSeriesData should support different frequencies', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('chkfrq'), 'QQ');
      return mockCsvResponse('Date,Value\n2024Q1,100');
    };

    const result = await getTimeSeriesData({
      seriesCode: 'TEST123',
      frequency: 'QQ',
    });
    assert.equal(result.success, true);
  });

  it('getTimeSeriesData should handle HTML error responses', async () => {
    globalThis.fetch = async () => mockHtmlResponse('<html><body>Error: Invalid series code</body></html>');

    const result = await getTimeSeriesData({ seriesCode: 'INVALID' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /error/i);
  });

  it('getTimeSeriesData should handle HTTP errors', async () => {
    globalThis.fetch = async () => new Response('Not Found', { status: 404 });

    const result = await getTimeSeriesData({ seriesCode: 'TEST123' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 404/);
  });

  it('getMajorStatistics should return major statistics list', async () => {
    const result = await getMajorStatistics();
    assert.equal(result.success, true);
    const data = result.data as { statistics?: Array<{ code: string; name: string; category: string }> };
    assert.ok(Array.isArray(data.statistics));
    assert.ok(data.statistics && data.statistics.length > 0);
    assert.ok(data.statistics?.[0].code);
    assert.ok(data.statistics?.[0].name);
    assert.ok(data.statistics?.[0].category);
  });

  it('getMajorStatistics should include common series codes', async () => {
    const result = await getMajorStatistics();
    const data = result.data as { statistics?: Array<{ code: string }> };
    const codes = data.statistics?.map(s => s.code) || [];
    assert.ok(codes.some(c => c.includes('MD')), 'Should include Money Stock codes');
    assert.ok(codes.some(c => c.includes('FEXX')), 'Should include Exchange Rate codes');
  });
});
