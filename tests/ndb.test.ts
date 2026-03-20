/**
 * NDB OpenData Hub API Tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getInspectionStats,
  getItems,
  getAreas,
  getRangeLabels,
  getHealth,
} from '../build/providers/ndb.js';
import { mockJsonResponse, setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('NDB OpenData Hub API', () => {
  it('getInspectionStats should fetch inspection data with itemName', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://ndbopendata-hub.com');
      assert.equal(url.pathname, '/api/v1/inspection-stats');
      assert.equal(url.searchParams.get('item_name'), 'BMI');
      assert.equal(url.searchParams.get('record_mode'), 'inspection');
      return mockJsonResponse({ data: [], total: 0 });
    };

    const result = await getInspectionStats({ itemName: 'BMI' });
    assert.equal(result.success, true);
  });

  it('getInspectionStats should fail when itemName is empty', async () => {
    const result = await getInspectionStats({ itemName: '  ' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /itemName is required/);
  });

  it('getInspectionStats should send optional parameters', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('prefecture_name'), '東京都');
      assert.equal(url.searchParams.get('gender'), 'male');
      assert.equal(url.searchParams.get('age_group'), '40-44');
      return mockJsonResponse({ data: [] });
    };

    const result = await getInspectionStats({
      itemName: 'BMI',
      prefectureName: '東京都',
      gender: 'male',
      ageGroup: '40-44',
    });
    assert.equal(result.success, true);
  });

  it('getItems should fetch inspection items list', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/api/v1/items');
      assert.equal(url.searchParams.get('dataset'), 'inspection');
      return mockJsonResponse({ items: ['BMI', 'HbA1c'] });
    };

    const result = await getItems();
    assert.equal(result.success, true);
  });

  it('getAreas should fetch prefecture list by default', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/api/v1/areas');
      assert.equal(url.searchParams.get('type'), 'prefecture');
      return mockJsonResponse({ areas: [] });
    };

    const result = await getAreas();
    assert.equal(result.success, true);
  });

  it('getAreas should fetch secondary_medical_area when specified', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('type'), 'secondary_medical_area');
      return mockJsonResponse({ areas: [] });
    };

    const result = await getAreas({ type: 'secondary_medical_area' });
    assert.equal(result.success, true);
  });

  it('getRangeLabels should fetch range labels for item', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/api/v1/range-labels');
      assert.equal(url.searchParams.get('item_name'), 'BMI');
      assert.equal(url.searchParams.get('record_mode'), 'inspection');
      return mockJsonResponse({ ranges: [] });
    };

    const result = await getRangeLabels({ itemName: 'BMI' });
    assert.equal(result.success, true);
  });

  it('getRangeLabels should fail when itemName is empty', async () => {
    const result = await getRangeLabels({ itemName: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /itemName is required/);
  });

  it('getHealth should fetch API health status', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/api/v1/health');
      return mockJsonResponse({ status: 'ok' });
    };

    const result = await getHealth();
    assert.equal(result.success, true);
  });

  it('should handle HTTP error responses', async () => {
    globalThis.fetch = async () => new Response('Not Found', { status: 404 });

    const result = await getInspectionStats({ itemName: 'BMI' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 404/);
  });
});
