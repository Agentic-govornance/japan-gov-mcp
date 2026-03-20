import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  geocode,
  reverseGeocode,
} from '../build/providers/geo.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('地理・地図API', () => {
  it('geocode should fetch GSI geocoding by address', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://msearch.gsi.go.jp');
      assert.equal(url.pathname, '/address-search/AddressSearch');
      assert.equal(url.searchParams.get('q'), '東京都千代田区千代田1-1');
      return mockJsonResponse([
        {
          geometry: { coordinates: [139.7528, 35.6852] },
          properties: { title: '東京都千代田区千代田1-1' },
        },
      ]);
    };

    const result = await geocode({ address: '東京都千代田区千代田1-1' });
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.data));
  });

  it('geocode should fail when address is empty', async () => {
    const result = await geocode({ address: '   ' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /address is required/);
  });

  it('reverseGeocode should fetch GSI reverse geocoding by lat/lon', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://mreversegeocoder.gsi.go.jp');
      assert.equal(url.pathname, '/reverse-geocoder/LonLatToAddress');
      assert.equal(url.searchParams.get('lat'), '35.6895');
      assert.equal(url.searchParams.get('lon'), '139.6917');
      return mockJsonResponse({
        results: { mupiCode: '13101', lv01Nm: '東京都千代田区' },
      });
    };

    const result = await reverseGeocode({ lat: 35.6895, lon: 139.6917 });
    assert.equal(result.success, true);
    assert.equal((result.data as { results?: { lv01Nm?: string } })?.results?.lv01Nm, '東京都千代田区');
  });

  it('reverseGeocode should fail when lat out of range', async () => {
    const result = await reverseGeocode({ lat: -91, lon: 139.7 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lat must be between -90 and 90/);
  });

  it('reverseGeocode should fail when lon out of range', async () => {
    const result = await reverseGeocode({ lat: 35.6, lon: 181 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lon must be between -180 and 180/);
  });
});
