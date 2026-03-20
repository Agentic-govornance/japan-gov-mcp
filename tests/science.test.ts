import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getAirQuality,
  getGeologyLegend,
  getGeologyAtPoint,
  getJaxaCollections,
} from '../build/providers/science.js';
import { setupFetchMock, mockJsonResponse, mockCsvResponse } from './helpers.ts';

setupFetchMock();

describe('科学・環境API', () => {
  it('getAirQuality should fetch CSV and parse to JSON', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /soramame\.env\.go\.jp\/data\/map\/kyokuNoudo/);
      assert.match(url, /\.csv$/);
      return mockCsvResponse(
        '緯度,経度,測定局コード,測定局名称,所在地,測定局種別,問い合わせ先,都道府県コード\n43.062,141.354,01101010,センター,札幌市,一般局,札幌市,01'
      );
    };

    const result = await getAirQuality({});
    assert.equal(result.success, true);
    const data = result.data as { stations: unknown[]; count: number };
    assert.equal(data.count, 1);
    assert.equal(data.stations.length, 1);
  });

  it('getAirQuality should filter by stationCode', async () => {
    globalThis.fetch = async () => {
      return mockCsvResponse(
        '緯度,経度,測定局コード,測定局名称\n43.0,141.3,01101010,A\n35.6,139.7,13101010,B'
      );
    };

    const result = await getAirQuality({ stationCode: '13101010' });
    assert.equal(result.success, true);
    const data = result.data as { stations: unknown[]; count: number };
    assert.equal(data.count, 1);
  });

  it('getAirQuality should fail when stationCode is blank', async () => {
    const result = await getAirQuality({ stationCode: '   ' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /stationCode must not be empty/);
  });

  it('getGeologyLegend should fetch legend json', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /1\.2\/legend\.json$/);
      return mockJsonResponse([{ id: 1, name: '沖積層' }]);
    };

    const result = await getGeologyLegend();
    assert.equal(result.success, true);
    assert.equal(Array.isArray(result.data), true);
  });

  it('getGeologyAtPoint should use legend.json?point= endpoint', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /1\.2\/legend\.json$/);
      assert.equal(url.searchParams.get('point'), '35.6895,139.6917');
      return mockJsonResponse({ geology: 'alluvium' });
    };

    const result = await getGeologyAtPoint({ lat: 35.6895, lon: 139.6917 });
    assert.equal(result.success, true);
    assert.equal((result.data as { geology?: string })?.geology, 'alluvium');
  });

  it('getGeologyAtPoint should fail when lat is out of range', async () => {
    const result = await getGeologyAtPoint({ lat: 91, lon: 139.7 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lat must be between -90 and 90/);
  });

  it('getGeologyAtPoint should fail when lon is not finite', async () => {
    const result = await getGeologyAtPoint({ lat: 35.6, lon: Number.NaN });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lat and lon must be finite numbers/);
  });

  it('getJaxaCollections should fetch catalog.json and extract child links', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /stac\/cog\/v1\/catalog\.json$/);
      return mockJsonResponse({
        links: [
          { rel: 'root', href: 'catalog.json' },
          { rel: 'child', href: 'col1/collection.json', title: 'Collection 1' },
          { rel: 'child', href: 'col2/collection.json', title: 'Collection 2' },
        ],
      });
    };

    const result = await getJaxaCollections({});
    assert.equal(result.success, true);
    const data = result.data as { total: number; returned: number; collections: unknown[] };
    assert.equal(data.total, 2);
    assert.equal(data.returned, 2);
  });

  it('getJaxaCollections should return error on non-OK status', async () => {
    globalThis.fetch = async () => mockJsonResponse({ message: 'error' }, 500);

    const result = await getJaxaCollections({ limit: 5 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 500/);
  });
});
