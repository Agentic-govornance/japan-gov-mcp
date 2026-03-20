import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchCorporation,
  getCertification,
  getSubsidy,
  getPatent,
  getProcurement,
  getFinance,
  getCommendation,
  getWorkplace,
  type GbizConfig,
} from '../build/providers/gbiz.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

const TEST_CONFIG: GbizConfig = { token: 'test-gbiz-token' };

setupFetchMock();

describe('gBizINFO API', () => {
  describe('searchCorporation', () => {
    it('should search by name', async () => {
      globalThis.fetch = async (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.searchParams.get('name'), 'テスト');
        const headers = init?.headers as Record<string, string>;
        assert.equal(headers['X-hojinInfo-api-token'], 'test-gbiz-token');
        return mockJsonResponse({ 'hojin-infos': [], totalCount: 0 });
      };
      const result = await searchCorporation(TEST_CONFIG, { name: 'テスト' });
      assert.equal(result.success, true);
    });

    it('should search by corporateNumber', async () => {
      globalThis.fetch = async (input) => {
        const url = String(input);
        assert.match(url, /hojin\/1234567890123$/);
        return mockJsonResponse({ 'hojin-infos': [{ name: 'テスト法人' }] });
      };
      const result = await searchCorporation(TEST_CONFIG, { corporateNumber: '1234567890123' });
      assert.equal(result.success, true);
    });

    it('should fail when token is empty', async () => {
      const result = await searchCorporation({ token: '' }, { name: 'テスト' });
      assert.equal(result.success, false);
      assert.match(result.error || '', /token is required/);
    });
  });

  describe('detail endpoints', () => {
    const CN = '1234567890123';

    it('getCertification should fetch certification info', async () => {
      globalThis.fetch = async (input) => {
        assert.match(String(input), /certification$/);
        return mockJsonResponse({});
      };
      const result = await getCertification(TEST_CONFIG, CN);
      assert.equal(result.success, true);
    });

    it('getSubsidy should fetch subsidy info', async () => {
      globalThis.fetch = async (input) => {
        assert.match(String(input), /subsidy$/);
        return mockJsonResponse({});
      };
      const result = await getSubsidy(TEST_CONFIG, CN);
      assert.equal(result.success, true);
    });

    it('getPatent should fetch patent info', async () => {
      globalThis.fetch = async (input) => {
        assert.match(String(input), /patent$/);
        return mockJsonResponse({});
      };
      const result = await getPatent(TEST_CONFIG, CN);
      assert.equal(result.success, true);
    });

    it('getProcurement should fetch procurement info', async () => {
      globalThis.fetch = async (input) => {
        assert.match(String(input), /procurement$/);
        return mockJsonResponse({});
      };
      const result = await getProcurement(TEST_CONFIG, CN);
      assert.equal(result.success, true);
    });

    it('getFinance should fetch finance info', async () => {
      globalThis.fetch = async (input) => {
        assert.match(String(input), /finance$/);
        return mockJsonResponse({});
      };
      const result = await getFinance(TEST_CONFIG, CN);
      assert.equal(result.success, true);
    });

    it('getCommendation should fetch commendation info', async () => {
      globalThis.fetch = async (input) => {
        assert.match(String(input), /commendation$/);
        return mockJsonResponse({});
      };
      const result = await getCommendation(TEST_CONFIG, CN);
      assert.equal(result.success, true);
    });

    it('getWorkplace should fetch workplace info', async () => {
      globalThis.fetch = async (input) => {
        assert.match(String(input), /workplace$/);
        return mockJsonResponse({});
      };
      const result = await getWorkplace(TEST_CONFIG, CN);
      assert.equal(result.success, true);
    });

    it('should fail when corporateNumber is empty', async () => {
      const result = await getCertification(TEST_CONFIG, '');
      assert.equal(result.success, false);
      assert.match(result.error || '', /corporateNumber is required/);
    });

    it('should fail when token is empty', async () => {
      const result = await getSubsidy({ token: '' }, CN);
      assert.equal(result.success, false);
      assert.match(result.error || '', /token is required/);
    });
  });
});
