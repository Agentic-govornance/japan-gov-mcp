import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchLaws,
  getLawData,
  searchLawsByKeyword,
} from '../build/providers/law.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('法令API', () => {
  it('searchLaws should fetch law list', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /\/laws$/);
      assert.equal(url.searchParams.get('category'), '2');
      assert.equal(url.searchParams.get('offset'), '0');
      assert.equal(url.searchParams.get('limit'), '20');
      return mockJsonResponse({ laws: [] });
    };
    const result = await searchLaws({ category: 2 });
    assert.equal(result.success, true);
    assert.deepEqual(result.data, { laws: [] });
  });

  it('searchLaws should use default category 2', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('category'), '2');
      return mockJsonResponse({ laws: [] });
    };
    const result = await searchLaws({});
    assert.equal(result.success, true);
  });

  it('searchLaws should reject invalid category', async () => {
    const result = await searchLaws({ category: 7 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /category must be/);
  });

  it('getLawData should fetch by lawId', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /law_data\/129AC0000000089/);
      assert.match(url, /response_format=json/);
      return mockJsonResponse({ law: { lawId: '129AC0000000089' } });
    };
    const result = await getLawData({ lawId: '129AC0000000089' });
    assert.equal(result.success, true);
  });

  it('getLawData should fail when lawId missing', async () => {
    const result = await getLawData({});
    assert.equal(result.success, false);
    assert.match(result.error || '', /lawId is required/);
  });

  it('searchLawsByKeyword should search with keyword', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /\/laws$/);
      assert.equal(url.searchParams.get('keyword'), '個人情報');
      assert.equal(url.searchParams.get('offset'), '10');
      assert.equal(url.searchParams.get('limit'), '5');
      return mockJsonResponse({ laws: [{ lawId: 'abc' }] });
    };
    const result = await searchLawsByKeyword({ keyword: '個人情報', offset: 10, limit: 5 });
    assert.equal(result.success, true);
  });

  it('searchLawsByKeyword should reject empty keyword', async () => {
    const result = await searchLawsByKeyword({ keyword: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /keyword is required/);
  });
});
