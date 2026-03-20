/**
 * Shared test utilities for japan-gov-mcp
 * Mock response factories and test environment setup
 */

import { afterEach } from 'node:test';
import { cache, rateLimiters } from '../build/utils/http.js';

/** Save/restore globalThis.fetch and clear cache + rate limiters after each test */
export function setupFetchMock() {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    cache.clear();
    rateLimiters.clear();
  });
}

/** Create a mock JSON Response */
export function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Create a mock XML Response */
export function mockXmlResponse(xml: string, status = 200, statusText = 'OK'): Response {
  return new Response(xml, {
    status,
    statusText,
    headers: { 'content-type': 'application/xml' },
  });
}

/** Create a mock CSV Response */
export function mockCsvResponse(csv: string, status = 200): Response {
  return new Response(csv, {
    status,
    headers: { 'content-type': 'text/csv' },
  });
}

/** Create a mock HTML Response */
export function mockHtmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html' },
  });
}

/** Create a mock text Response */
export function mockTextResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: { 'content-type': 'text/plain' },
  });
}
