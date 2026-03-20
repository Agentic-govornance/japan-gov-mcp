import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getRealEstateTransactions,
  getLandPrice,
} from '../build/providers/realestate.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('不動産情報ライブラリ', () => {
  const config = { apiKey: 'test-key' };

  it('getRealEstateTransactions should fetch with key header', async () => {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /XIT001/);
      assert.equal(url.searchParams.get('year'), '20231');
      assert.equal(url.searchParams.get('quarter'), '20234');
      const headers = init?.headers as Record<string, string> | undefined;
      assert.equal(headers?.['Ocp-Apim-Subscription-Key'], 'test-key');
      return mockJsonResponse({ status: 'OK', data: [] });
    };
    const result = await getRealEstateTransactions(config, { year: '20231', quarter: '20234', area: '13' });
    assert.equal(result.success, true);
  });

  it('getRealEstateTransactions should fail when apiKey missing', async () => {
    const result = await getRealEstateTransactions({ apiKey: '' }, { year: '20231', quarter: '20234' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /API key is required/);
  });

  it('getRealEstateTransactions should fail when year missing', async () => {
    const result = await getRealEstateTransactions(config, { year: '', quarter: '20234' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /year and quarter are required/);
  });

  it('getLandPrice should fetch with key header', async () => {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /XIT002/);
      const headers = init?.headers as Record<string, string> | undefined;
      assert.equal(headers?.['Ocp-Apim-Subscription-Key'], 'test-key');
      return mockJsonResponse({ status: 'OK', data: [] });
    };
    const result = await getLandPrice(config, { year: '2023', area: '13' });
    assert.equal(result.success, true);
  });

  it('getLandPrice should fail when apiKey missing', async () => {
    const result = await getLandPrice({ apiKey: '' }, { year: '2023' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /API key is required/);
  });
});
