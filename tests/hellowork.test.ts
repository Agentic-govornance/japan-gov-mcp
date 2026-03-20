import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { searchJobs } from '../build/providers/hellowork.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('ハローワーク', () => {
  it('searchJobs should fail when apiKey missing', async () => {
    const result = await searchJobs({ apiKey: '' }, { keyword: 'エンジニア' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /API key is required/);
  });

  it('searchJobs should send correct request', async () => {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /offers/);
      assert.equal(url.searchParams.get('keyword'), 'エンジニア');
      const headers = init?.headers as Record<string, string> | undefined;
      assert.equal(headers?.['X-API-KEY'], 'test-key');
      return mockJsonResponse({ results: [] });
    };
    const result = await searchJobs({ apiKey: 'test-key' }, { keyword: 'エンジニア' });
    assert.equal(result.success, true);
  });
});
