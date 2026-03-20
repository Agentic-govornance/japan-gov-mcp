import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getDashboardIndicators,
  getDashboardData,
} from '../build/providers/dashboard.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('統計ダッシュボード', () => {
  it('getDashboardIndicators should fetch indicators', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /getIndicatorInfo/);
      assert.equal(url.searchParams.get('Lang'), 'JP');
      // MetaGetFlg removed
      assert.equal(url.searchParams.get('MetaGetFlg'), null);
      return mockJsonResponse({ GET_INDICATOR_INFO: { RESULT: { STATUS: 0 } } });
    };
    const result = await getDashboardIndicators({});
    assert.equal(result.success, true);
  });

  it('getDashboardIndicators should pass indicatorCode', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('IndicatorCode'), '0201010010000010010');
      return mockJsonResponse({ GET_INDICATOR_INFO: {} });
    };
    const result = await getDashboardIndicators({ indicatorCode: '0201010010000010010' });
    assert.equal(result.success, true);
  });

  it('getDashboardData should use getData endpoint', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /getData/);
      assert.equal(url.searchParams.get('IndicatorCode'), '0201010010000010010');
      return mockJsonResponse({ GET_STATS_DATA: { RESULT: { STATUS: 0 } } });
    };
    const result = await getDashboardData({ indicatorCode: '0201010010000010010' });
    assert.equal(result.success, true);
  });

  it('getDashboardData should fail when indicatorCode missing', async () => {
    const result = await getDashboardData({ indicatorCode: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /indicatorCode is required/);
  });
});

describe('HTTP error handling (dashboard)', () => {
  it('should handle 500 error', async () => {
    globalThis.fetch = async () => new Response('Server Error', { status: 500, statusText: 'Internal Server Error' });
    const result = await getDashboardIndicators({});
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 500/);
  });
});
