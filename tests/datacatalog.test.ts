import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchDatasets,
  getDatasetDetail,
  listOrganizations,
} from '../build/providers/datacatalog.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('データカタログ', () => {
  it('searchDatasets should search with query', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /package_search/);
      assert.equal(url.searchParams.get('q'), '人口');
      assert.equal(url.searchParams.get('rows'), '20');
      return mockJsonResponse({ success: true, result: { count: 100, results: [] } });
    };
    const result = await searchDatasets({ q: '人口' });
    assert.equal(result.success, true);
    assert.equal(result.data?.success, true);
  });

  it('searchDatasets should respect custom rows', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('rows'), '5');
      return mockJsonResponse({ success: true, result: { count: 5, results: [] } });
    };
    const result = await searchDatasets({ q: '人口', rows: 5 });
    assert.equal(result.success, true);
  });

  it('getDatasetDetail should fetch by id', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /package_show/);
      assert.equal(url.searchParams.get('id'), 'abc-123');
      return mockJsonResponse({ success: true, result: { id: 'abc-123', title: 'テスト' } });
    };
    const result = await getDatasetDetail({ id: 'abc-123' });
    assert.equal(result.success, true);
  });

  it('getDatasetDetail should fail when id missing', async () => {
    const result = await getDatasetDetail({ id: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /id is required/);
  });

  it('listOrganizations should fetch org list', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /organization_list/);
      return mockJsonResponse({ success: true, result: [{ name: 'mlit' }] });
    };
    const result = await listOrganizations();
    assert.equal(result.success, true);
  });
});

describe('HTTP error handling (datacatalog)', () => {
  it('should handle 404 error', async () => {
    globalThis.fetch = async () => new Response('Not Found', { status: 404, statusText: 'Not Found' });
    const result = await searchDatasets({ q: 'test' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 404/);
  });
});
