import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { searchAgriKnowledge } from '../build/providers/agriknowledge.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('AgriKnowledge', () => {
  it('searchAgriKnowledge should fetch search results', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://agriknowledge.affrc.go.jp');
      assert.equal(url.pathname, '/RNJ/api/2.0/search');
      assert.equal(url.searchParams.get('query'), '水稲');
      assert.equal(url.searchParams.get('count'), '3');
      return mockJsonResponse({ total: 1, records: [{ id: 'A001' }] });
    };

    const result = await searchAgriKnowledge({ query: '水稲', count: 3 });
    assert.equal(result.success, true);
    assert.equal((result.data as { total?: number })?.total, 1);
  });

  it('searchAgriKnowledge should fail when query is empty', async () => {
    const result = await searchAgriKnowledge({ query: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /query is required/);
  });
});
