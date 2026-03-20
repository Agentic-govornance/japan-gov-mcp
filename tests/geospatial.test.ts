import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchGeospatial,
  getGeospatialDataset,
  listGeospatialOrganizations,
} from '../build/providers/geospatial.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('G空間情報センター API', () => {
  it('searchGeospatial should call package_search endpoint', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /package_search/);
      assert.equal(url.searchParams.get('q'), '浸水');
      assert.equal(url.searchParams.get('rows'), '20');
      assert.equal(url.searchParams.get('start'), '0');
      return mockJsonResponse({ success: true, result: { count: 1, results: [] } });
    };

    const result = await searchGeospatial({ q: '浸水' });
    assert.equal(result.success, true);
    assert.equal(result.data?.success, true);
  });

  it('getGeospatialDataset should call package_show endpoint', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /package_show/);
      assert.equal(url.searchParams.get('id'), 'dataset-001');
      return mockJsonResponse({ success: true, result: { id: 'dataset-001' } });
    };

    const result = await getGeospatialDataset({ id: 'dataset-001' });
    assert.equal(result.success, true);
  });

  it('getGeospatialDataset should fail when id is empty', async () => {
    const result = await getGeospatialDataset({ id: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /id is required/);
  });

  it('listGeospatialOrganizations should call organization_list endpoint', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /organization_list/);
      assert.equal(url.searchParams.get('all_fields'), 'true');
      assert.equal(url.searchParams.get('limit'), '100');
      return mockJsonResponse({ success: true, result: [{ name: 'gsi' }] });
    };

    const result = await listGeospatialOrganizations();
    assert.equal(result.success, true);
    assert.equal(result.data?.success, true);
  });
});
