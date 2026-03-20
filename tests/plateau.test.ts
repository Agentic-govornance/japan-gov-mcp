import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchPlateauDatasets,
  getPlateauCitygml,
} from '../build/providers/plateau.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('PLATEAU 3D都市モデルAPI', () => {
  it('searchPlateauDatasets should return full list when no filters', async () => {
    const datasets = [
      { id: '1', name: '東京都千代田区', prefecture: '東京都', city: '千代田区', type: '建築物' },
      { id: '2', name: '大阪府大阪市', prefecture: '大阪府', city: '大阪市', type: '道路' },
    ];
    globalThis.fetch = async () => mockJsonResponse({ success: true, result: { results: datasets } });

    const result = await searchPlateauDatasets({});
    assert.equal(result.success, true);
    assert.equal(Array.isArray(result.data), true);
    assert.equal((result.data as unknown[]).length, 2);
  });

  it('searchPlateauDatasets should filter by prefecture', async () => {
    const datasets = [
      { id: '1', name: '東京都千代田区', prefecture: '東京都', city: '千代田区', type: '建築物' },
      { id: '2', name: '大阪府大阪市', prefecture: '大阪府', city: '大阪市', type: '道路' },
    ];
    globalThis.fetch = async () => mockJsonResponse({ success: true, result: { results: datasets } });

    const result = await searchPlateauDatasets({ prefecture: '東京都' });
    assert.equal(result.success, true);
    assert.equal((result.data as unknown[]).length, 1);
  });

  it('searchPlateauDatasets should filter by city and type', async () => {
    const datasets = [
      { id: '1', name: '千代田区建築物', prefecture: '東京都', city: '千代田区', type: '建築物' },
      { id: '2', name: '千代田区道路', prefecture: '東京都', city: '千代田区', type: '道路' },
    ];
    globalThis.fetch = async () => mockJsonResponse({ success: true, result: { results: datasets } });

    const result = await searchPlateauDatasets({ city: '千代田区', type: '建築物' });
    assert.equal(result.success, true);
    assert.equal((result.data as unknown[]).length, 1);
  });

  it('getPlateauCitygml should fetch CityGML by meshCode', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /citygml\/m:53394525/);
      return mockJsonResponse({ cities: ['東京都千代田区'], featureTypes: { bldg: 100 } });
    };

    const result = await getPlateauCitygml({ meshCode: '53394525' });
    assert.equal(result.success, true);
    assert.equal((result.data as { cities?: string[] })?.cities?.[0], '東京都千代田区');
  });

  it('getPlateauCitygml should fail when meshCode is empty', async () => {
    const result = await getPlateauCitygml({ meshCode: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /meshCode is required/);
  });

  it('getPlateauCitygml should fail when meshCode is not 8 digits', async () => {
    const result = await getPlateauCitygml({ meshCode: '1234' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /meshCode must be 8 digits/);
  });
});
