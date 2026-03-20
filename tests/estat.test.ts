import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getMetaInfo,
  getStatsData,
  getStatsList,
  refineSearch,
  type EStatConfig,
} from '../build/providers/estat.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

const TEST_CONFIG: EStatConfig = { appId: 'test-app-id' };

setupFetchMock();

describe('e-Stat Provider', () => {
  describe('getStatsList', () => {
    it('should search statistics by keyword', async () => {
      globalThis.fetch = async (input) => {
        const url = new URL(String(input));
        assert.match(url.pathname, /getStatsList/);
        assert.equal(url.searchParams.get('searchWord'), '人口');
        return mockJsonResponse({
          GET_STATS_LIST: {
            RESULT: { STATUS: 0, ERROR_MSG: '', DATE: '2026-02-14 00:00:00.000' },
            DATALIST_INF: { NUMBER: 1, TABLE_INF: { '@id': '000001' } },
          },
        });
      };

      const result = await getStatsList(TEST_CONFIG, { searchWord: '人口' });
      assert.equal(result.success, true);
      assert.equal(result.data?.GET_STATS_LIST.DATALIST_INF?.NUMBER, 1);
    });

    it('should handle empty results', async () => {
      globalThis.fetch = async () =>
        mockJsonResponse({
          GET_STATS_LIST: {
            RESULT: { STATUS: 0, ERROR_MSG: '' },
            DATALIST_INF: { NUMBER: 0, TABLE_INF: [] },
          },
        });

      const result = await getStatsList(TEST_CONFIG, { searchWord: 'not-found' });
      assert.equal(result.success, true);
      assert.equal(result.data?.GET_STATS_LIST.DATALIST_INF?.NUMBER, 0);
    });

    it('should respect limit parameter', async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.match(url, /limit=5/);
        return mockJsonResponse({
          GET_STATS_LIST: { RESULT: { STATUS: 0, ERROR_MSG: '' } },
        });
      };

      const result = await getStatsList(TEST_CONFIG, { searchWord: '人口', limit: 5 });
      assert.equal(result.success, true);
    });
  });

  describe('getMetaInfo', () => {
    it('should return meta information for valid statsDataId', async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.match(url, /statsDataId=0000010101/);
        return mockJsonResponse({
          GET_META_INFO: { RESULT: { STATUS: 0, ERROR_MSG: '' }, METADATA_INF: {} },
        });
      };

      const result = await getMetaInfo(TEST_CONFIG, { statsDataId: '0000010101' });
      assert.equal(result.success, true);
    });

    it('should handle invalid statsDataId', async () => {
      globalThis.fetch = async () =>
        mockJsonResponse({
          GET_META_INFO: {
            RESULT: { STATUS: 100, ERROR_MSG: 'statsDataId is invalid' },
          },
        });

      const result = await getMetaInfo(TEST_CONFIG, { statsDataId: 'invalid' });
      assert.equal(result.success, false);
      assert.match(result.error || '', /invalid/);
    });
  });

  describe('getStatsData', () => {
    it('should fetch statistical data', async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.match(url, /getStatsData/);
        assert.match(url, /statsDataId=0000010101/);
        return mockJsonResponse({
          GET_STATS_DATA: { RESULT: { STATUS: 0, ERROR_MSG: '' }, STATISTICAL_DATA: {} },
        });
      };

      const result = await getStatsData(TEST_CONFIG, { statsDataId: '0000010101' });
      assert.equal(result.success, true);
    });

    it('should handle pagination', async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.match(url, /startPosition=101/);
        assert.match(url, /limit=50/);
        return mockJsonResponse({
          GET_STATS_DATA: { RESULT: { STATUS: 0, ERROR_MSG: '' } },
        });
      };

      const result = await getStatsData(TEST_CONFIG, {
        statsDataId: '0000010101',
        startPosition: 101,
        limit: 50,
      });
      assert.equal(result.success, true);
    });

    it('should filter by time/area/category', async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.match(url, /cdTime=2020/);
        assert.match(url, /cdArea=13000/);
        assert.match(url, /cdCat01=A1101/);
        return mockJsonResponse({
          GET_STATS_DATA: { RESULT: { STATUS: 0, ERROR_MSG: '' } },
        });
      };

      const result = await getStatsData(TEST_CONFIG, {
        statsDataId: '0000010101',
        cdTime: '2020',
        cdArea: '13000',
        cdCat01: 'A1101',
      });
      assert.equal(result.success, true);
    });
  });

  describe('error handling', () => {
    it('should fail when appId is missing', async () => {
      const result = await getStatsList({ appId: '' }, { searchWord: '人口' });
      assert.equal(result.success, false);
      assert.match(result.error || '', /appId is required/);
    });

    it('should fail on HTTP error', async () => {
      globalThis.fetch = async () => new Response('failed', { status: 500, statusText: 'Internal Server Error' });
      const result = await getStatsList(TEST_CONFIG, { searchWord: '人口' });
      assert.equal(result.success, false);
      assert.match(result.error || '', /HTTP 500/);
    });

    it('should fail on invalid limit', async () => {
      const result = await getStatsData(TEST_CONFIG, { statsDataId: '0000010101', limit: 100001 });
      assert.equal(result.success, false);
      assert.match(result.error || '', /limit must be/);
    });

    it('should support refineSearch endpoint', async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.match(url, /refineSearch/);
        assert.match(url, /statsDataId=0000010101/);
        return mockJsonResponse({
          GET_REFINE_SEARCH: { RESULT: { STATUS: 0, ERROR_MSG: '' }, REFINE_INF: {} },
        });
      };
      const result = await refineSearch(TEST_CONFIG, { statsDataId: '0000010101' });
      assert.equal(result.success, true);
    });
  });
});
