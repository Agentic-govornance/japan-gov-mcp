/**
 * Scenario Composite Tools Tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { regionalHealthEconomy, laborDemandSupply } from '../build/scenarios/regional-analysis.js';
import { mockJsonResponse, setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('Scenario: Regional Health Economy', () => {
  it('should validate prefectureCode format', async () => {
    const result = await regionalHealthEconomy({ prefectureCode: 'invalid' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /must be a 2-digit code/);
  });

  it('should call multiple APIs in parallel', async () => {
    let callCount = 0;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      callCount++;
      const url = new URL(String(input));

      // NDB API mock
      if (url.hostname === 'ndbopendata-hub.com') {
        return mockJsonResponse({ data: [], total: 0 });
      }

      // Dashboard API mock
      if (url.hostname === 'dashboard.e-stat.go.jp') {
        return mockJsonResponse({ value: [] });
      }

      // BOJ API mock (CSV response)
      if (url.hostname === 'www.stat-search.boj.or.jp') {
        return new Response('Date,Value\n2024-01,100', {
          status: 200,
          headers: { 'content-type': 'text/csv' },
        });
      }

      return mockJsonResponse({});
    };

    const result = await regionalHealthEconomy({ prefectureCode: '13', year: 2024 });
    assert.equal(result.success, true);
    assert.ok(callCount >= 3, 'Should call multiple APIs');

    const data = result.data as Record<string, unknown>;
    assert.ok(data.prefecture);
    assert.ok(data.health);
    assert.ok(data.population);
    assert.ok(data.macro);
  });

  it('should handle API failures gracefully', async () => {
    globalThis.fetch = async () => {
      throw new Error('Network error');
    };

    const result = await regionalHealthEconomy({ prefectureCode: '13' });
    // Should still succeed but contain error info
    assert.equal(result.success, true);
    const data = result.data as Record<string, unknown>;
    assert.ok(data.health);
  });
});

describe('Scenario: Labor Demand Supply', () => {
  it('should validate prefectureCode format', async () => {
    const result = await laborDemandSupply({ prefectureCode: 'ABC' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /must be a 2-digit code/);
  });

  it('should return skipped status when API keys are missing', async () => {
    const result = await laborDemandSupply({ prefectureCode: '13' });
    assert.equal(result.success, true);

    const data = result.data as Record<string, unknown>;
    assert.ok(data.prefecture);

    // Both APIs should be skipped due to missing keys
    const vacancies = data.vacancies as Record<string, unknown>;
    const laborStats = data.laborStats as Record<string, unknown>;
    assert.equal(vacancies.skipped, true);
    assert.equal(laborStats.skipped, true);
  });

  it('should call e-Stat when appId is provided', async () => {
    let estatCalled = false;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.e-stat.go.jp') {
        estatCalled = true;
        return mockJsonResponse({ GET_STATS_LIST: { RESULT: { STATUS: 0 }, DATA_INF: [] } });
      }
      return mockJsonResponse({});
    };

    const result = await laborDemandSupply({
      prefectureCode: '13',
      appId: 'test-app-id',
    });

    assert.equal(result.success, true);
    assert.ok(estatCalled, 'e-Stat API should be called');
  });
});
