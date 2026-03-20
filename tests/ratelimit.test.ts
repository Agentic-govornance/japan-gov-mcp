import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchJson, rateLimiters } from '../build/utils/http.js';
import { mockJsonResponse, setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('Rate Limiter', () => {
  it('should allow requests within rate limit', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      return mockJsonResponse({ ok: true });
    };

    const result = await fetchJson('https://example.com/api', { source: 'test' });
    assert.equal(result.success, true);
    assert.equal(fetchCount, 1);
  });

  it('should create separate limiters per host', async () => {
    globalThis.fetch = async () => mockJsonResponse({ ok: true });

    await fetchJson('https://api1.example.com/data', { source: 'test' });
    await fetchJson('https://api2.example.com/data', { source: 'test' });

    assert.equal(rateLimiters.size, 2);
    assert.ok(rateLimiters.has('api1.example.com'));
    assert.ok(rateLimiters.has('api2.example.com'));
  });

  it('should retry on 429 with backoff', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      if (fetchCount <= 2) {
        return new Response('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
      }
      return mockJsonResponse({ ok: true });
    };

    const result = await fetchJson('https://example.com/api', { source: 'test' });
    assert.equal(result.success, true);
    assert.equal(fetchCount, 3); // 2 retries then success
  });

  it('should respect Retry-After header on 429', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount++;
      if (fetchCount === 1) {
        return new Response('Too Many Requests', {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'Retry-After': '1' },
        });
      }
      return mockJsonResponse({ ok: true });
    };

    const start = Date.now();
    const result = await fetchJson('https://example.com/api', { source: 'test' });
    const elapsed = Date.now() - start;

    assert.equal(result.success, true);
    assert.equal(fetchCount, 2);
    assert.ok(elapsed >= 900, `Expected >=900ms wait, got ${elapsed}ms`); // ~1s from Retry-After
  });

  it('should fail after max retries on persistent 429', async () => {
    globalThis.fetch = async () => {
      return new Response('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    };

    const result = await fetchJson('https://example.com/api', { source: 'test' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 429/);
  });

  it('rateLimiters.clear should reset all limiters', async () => {
    globalThis.fetch = async () => mockJsonResponse({ ok: true });

    await fetchJson('https://example.com/api', { source: 'test' });
    assert.equal(rateLimiters.size, 1);

    rateLimiters.clear();
    assert.equal(rateLimiters.size, 0);
  });
});
