import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getCityBoundary,
  getPrefBoundary,
} from '../build/providers/geoshape.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('Geoshape API', () => {
  it('getCityBoundary should fetch city boundary geojson', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://geoshape.ex.nii.ac.jp');
      assert.equal(url.pathname, '/city/geojson/N03-20230101_13101.geojson');
      return mockJsonResponse({ type: 'FeatureCollection', features: [] });
    };

    const result = await getCityBoundary({ code: '13101' });
    assert.equal(result.success, true);
    assert.equal((result.data as { type?: string }).type, 'FeatureCollection');
  });

  it('getCityBoundary should fail when code is empty', async () => {
    const result = await getCityBoundary({ code: '   ' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /code is required/);
  });

  it('getCityBoundary should fail when code format is invalid', async () => {
    const result = await getCityBoundary({ code: '1234' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /5-digit municipality code/);

    const result2 = await getCityBoundary({ code: 'abcde' });
    assert.equal(result2.success, false);
    assert.match(result2.error || '', /5-digit municipality code/);
  });

  it('getPrefBoundary should fetch prefecture boundary geojson', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://geoshape.ex.nii.ac.jp');
      assert.equal(url.pathname, '/pref/geojson/N03-20230101_13000.geojson');
      return mockJsonResponse({ type: 'FeatureCollection', features: [] });
    };

    const result = await getPrefBoundary({ prefCode: '13' });
    assert.equal(result.success, true);
    assert.equal((result.data as { type?: string }).type, 'FeatureCollection');
  });

  it('getPrefBoundary should fail when prefCode is empty', async () => {
    const result = await getPrefBoundary({ prefCode: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /prefCode is required/);
  });

  it('getPrefBoundary should fail when prefCode format is invalid', async () => {
    const result = await getPrefBoundary({ prefCode: '1' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /prefCode must be a 2-digit code/);
  });
});
