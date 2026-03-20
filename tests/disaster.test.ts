import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getFloodDepth, getRiverLevel, getTrafficVolume } from '../build/providers/disaster.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('防災・交通API', () => {
  it('getFloodDepth should fetch flood depth by lat/lon', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.host, 'suiboumap.gsi.go.jp');
      assert.equal(url.searchParams.get('lat'), '35.6812');
      assert.equal(url.searchParams.get('lon'), '139.7671');
      assert.equal(url.searchParams.get('GroupType'), '0');
      return mockJsonResponse({ depth: 1.2, unit: 'm' });
    };

    const result = await getFloodDepth({ lat: 35.6812, lon: 139.7671 });
    assert.equal(result.success, true);
    assert.equal((result.data as { depth?: number })?.depth, 1.2);
  });

  it('getFloodDepth should fail when lat is out of range', async () => {
    const result = await getFloodDepth({ lat: 50, lon: 139.7671 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lat must be between 24 and 46/);
  });

  it('getFloodDepth should fail when lon is out of range', async () => {
    const result = await getFloodDepth({ lat: 35.6812, lon: 160 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lon must be between 122 and 154/);
  });

  it('getRiverLevel should fetch stations and observations', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('/stations')) {
        return mockJsonResponse({
          stations: [
            { station_id: 'test-station-1', name: 'テスト観測所' },
          ],
        });
      }
      if (url.includes('/observations')) {
        const parsed = new URL(url);
        assert.equal(parsed.searchParams.get('station_id'), 'test-station-1');
        return mockJsonResponse({
          station_id: 'test-station-1',
          level: 2.34,
        });
      }
      throw new Error(`unexpected url: ${url}`);
    };

    const result = await getRiverLevel({ stationId: 'test-station-1' });
    assert.equal(result.success, true);
    const data = result.data as {
      stationId?: string;
      station?: { name?: string };
      observation?: { level?: number };
    };
    assert.equal(data.stationId, 'test-station-1');
    assert.equal(data.station?.name, 'テスト観測所');
    assert.equal(data.observation?.level, 2.34);
  });

  it('getRiverLevel should fail when stationId is empty', async () => {
    const result = await getRiverLevel({ stationId: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /stationId is required/);
  });

  it('getTrafficVolume should fetch GeoJSON with WFS query', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.host, 'api.jartic-open-traffic.org');
      assert.equal(url.searchParams.get('service'), 'WFS');
      assert.equal(url.searchParams.get('request'), 'GetFeature');
      assert.equal(url.searchParams.get('outputFormat'), 'application/json');
      assert.equal(url.searchParams.get('count'), '5');
      assert.match(url.searchParams.get('CQL_FILTER') || '', /DWITHIN/);
      return mockJsonResponse({ type: 'FeatureCollection', features: [] });
    };

    const result = await getTrafficVolume({ lat: 35.681, lon: 139.767, radius: 1000, count: 5 });
    assert.equal(result.success, true);
    assert.equal((result.data as { type?: string })?.type, 'FeatureCollection');
  });

  it('getTrafficVolume should fail when lat is out of range', async () => {
    const result = await getTrafficVolume({ lat: 95, lon: 139.767 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lat must be between -90 and 90/);
  });
});
