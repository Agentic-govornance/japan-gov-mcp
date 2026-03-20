import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchJson, cache } from '../build/utils/http.js';
import { mockJsonResponse, setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('LRU Cache', () => {
  it('should cache successful responses', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return mockJsonResponse({ value: 42 });
    };

    const result1 = await fetchJson('https://example.com/api', {
      source: 'test',
      cacheTtl: 60000,
    });
    assert.equal(result1.success, true);
    assert.equal(result1.cached, undefined);
    assert.equal(fetchCount, 1);

    const result2 = await fetchJson('https://example.com/api', {
      source: 'test',
      cacheTtl: 60000,
    });
    assert.equal(result2.success, true);
    assert.equal(result2.cached, true);
    assert.equal(fetchCount, 1); // No additional fetch
  });

  it('should not cache when cacheTtl is not set', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return mockJsonResponse({ value: 42 });
    };

    await fetchJson('https://example.com/api', { source: 'test' });
    await fetchJson('https://example.com/api', { source: 'test' });
    assert.equal(fetchCount, 2);
  });

  it('should not cache error responses', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return new Response('error', { status: 500, statusText: 'Server Error' });
    };

    const result1 = await fetchJson('https://example.com/api', {
      source: 'test',
      cacheTtl: 60000,
    });
    assert.equal(result1.success, false);

    const result2 = await fetchJson('https://example.com/api', {
      source: 'test',
      cacheTtl: 60000,
    });
    assert.equal(result2.success, false);
    assert.equal(fetchCount, 2); // Both fetched, not cached
  });

  it('should expire entries after TTL', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return mockJsonResponse({ value: fetchCount });
    };

    // Cache with very short TTL
    await fetchJson('https://example.com/api', {
      source: 'test',
      cacheTtl: 1, // 1ms TTL
    });

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await fetchJson('https://example.com/api', {
      source: 'test',
      cacheTtl: 1,
    });
    assert.equal(result.cached, undefined); // Not from cache
    assert.equal(fetchCount, 2);
  });

  it('should cache different URLs separately', async () => {
    let fetchCount = 0;
    globalThis.fetch = async (input) => {
      fetchCount++;
      return mockJsonResponse({ url: String(input) });
    };

    await fetchJson('https://example.com/api/1', { source: 'test', cacheTtl: 60000 });
    await fetchJson('https://example.com/api/2', { source: 'test', cacheTtl: 60000 });
    assert.equal(fetchCount, 2);

    await fetchJson('https://example.com/api/1', { source: 'test', cacheTtl: 60000 });
    await fetchJson('https://example.com/api/2', { source: 'test', cacheTtl: 60000 });
    assert.equal(fetchCount, 2); // Both from cache
  });

  it('cache.clear should remove all entries', async () => {
    globalThis.fetch = async () => mockJsonResponse({ value: 1 });

    await fetchJson('https://example.com/api', { source: 'test', cacheTtl: 60000 });
    assert.equal(cache.size, 1);

    cache.clear();
    assert.equal(cache.size, 0);
  });
});
