/**
 * Extended Scenario Composite Tools Tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { corporateIntelligence } from '../build/scenarios/corporate-analysis.js';
import { disasterRiskAssessment } from '../build/scenarios/disaster-analysis.js';
import { academicTrend, academicTrendByTopics } from '../build/scenarios/academic-analysis.js';
import { realestateDemographics } from '../build/scenarios/realestate-analysis.js';
import { regionalEconomyFull, nationalEconomySummary } from '../build/scenarios/economy-analysis.js';
import { mockJsonResponse, setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('Scenario: Corporate Intelligence', () => {
  it('should require companyName or corporateNumber', async () => {
    const result = await corporateIntelligence({});
    assert.equal(result.success, false);
    assert.match(result.error || '', /companyName or corporateNumber is required/);
  });

  it('should skip when HOUJIN_APP_ID is not set', async () => {
    const result = await corporateIntelligence({ companyName: 'トヨタ自動車' });
    assert.equal(result.success, true);
    const data = result.data as { skipped?: boolean };
    assert.equal(data.skipped, true);
  });

  it('should use corporateNumber directly when provided', async () => {
    globalThis.fetch = async () => mockJsonResponse({ data: {} });

    const result = await corporateIntelligence({
      corporateNumber: '1234567890123',
      gbizToken: 'test-token',
    });

    assert.equal(result.success, true);
    const data = result.data as { corporateNumber?: string };
    assert.equal(data.corporateNumber, '1234567890123');
  });
});

describe('Scenario: Disaster Risk Assessment', () => {
  it('should require address or coordinates', async () => {
    const result = await disasterRiskAssessment({});
    assert.equal(result.success, false);
    assert.match(result.error || '', /Either address or .* is required/);
  });

  it('should use coordinates directly when provided', async () => {
    globalThis.fetch = async () => mockJsonResponse({ hazard: 0.5 });

    const result = await disasterRiskAssessment({ lat: 35.6895, lon: 139.6917 });
    assert.equal(result.success, true);

    const data = result.data as { location?: { lat?: number; lon?: number } };
    assert.equal(data.location?.lat, 35.6895);
    assert.equal(data.location?.lon, 139.6917);
  });

  it('should geocode address when provided', async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      // Geocoding mock - 国土地理院のレスポンス形式
      if (url.hostname === 'msearch.gsi.go.jp') {
        return mockJsonResponse([
          {
            geometry: { coordinates: [139.6917, 35.6895] },
            properties: { title: '東京都千代田区霞が関1-1-1' },
          },
        ]);
      }

      // Other API mocks (地震ハザード、浸水深など)
      return mockJsonResponse({ hazard: 0.1 });
    };

    const result = await disasterRiskAssessment({ address: '東京都千代田区霞が関1-1-1' });
    assert.equal(result.success, true);

    const data = result.data as { location?: { address?: string; lat?: number; lon?: number } };
    assert.equal(data.location?.address, '東京都千代田区霞が関1-1-1');
    assert.equal(data.location?.lat, 35.6895);
    assert.equal(data.location?.lon, 139.6917);
  });
});

describe('Scenario: Academic Trend', () => {
  it('should require keyword', async () => {
    const result = await academicTrend({ keyword: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /keyword is required/);
  });

  it('should search multiple academic databases', async () => {
    globalThis.fetch = async () =>
      mockJsonResponse({
        totalResults: 10,
        items: [{ title: 'Test Paper' }],
      });

    const result = await academicTrend({ keyword: 'AI', limit: 5 });
    assert.equal(result.success, true);

    const data = result.data as {
      keyword?: string;
      databases?: number;
      results?: Record<string, unknown>;
    };
    assert.equal(data.keyword, 'AI');
    assert.equal(data.databases, 4); // NDL, J-STAGE, CiNii, JapanSearch
    assert.ok(data.results);
  });

  it('should include AgriKnowledge when requested', async () => {
    globalThis.fetch = async () => mockJsonResponse({ totalResults: 5, items: [] });

    const result = await academicTrend({ keyword: '稲作', includeAgri: true });
    assert.equal(result.success, true);

    const data = result.data as { databases?: number };
    assert.equal(data.databases, 5); // +AgriKnowledge
  });
});

describe('Scenario: Academic Trend By Topics', () => {
  it('should require topics array', async () => {
    const result = await academicTrendByTopics({ topics: [] });
    assert.equal(result.success, false);
    assert.match(result.error || '', /topics array is required/);
  });

  it('should search multiple topics in parallel', async () => {
    globalThis.fetch = async () => mockJsonResponse({ totalResults: 1, items: [] });

    const result = await academicTrendByTopics({
      topics: ['AI', '機械学習', '深層学習'],
      limit: 3,
    });

    assert.equal(result.success, true);
    const data = result.data as { topics?: string[]; results?: Record<string, unknown> };
    assert.deepEqual(data.topics, ['AI', '機械学習', '深層学習']);
    assert.ok(data.results);
  });
});

describe('Scenario: Realestate Demographics', () => {
  it('should require prefecture or city', async () => {
    const result = await realestateDemographics({});
    assert.equal(result.success, false);
    assert.match(result.error || '', /prefecture or city is required/);
  });

  it('should skip realestate APIs when key is not set', async () => {
    globalThis.fetch = async () => mockJsonResponse({ value: [] });

    const result = await realestateDemographics({ prefecture: '13', year: 2023, quarter: 1 });
    assert.equal(result.success, true);

    const data = result.data as { realestate?: { transactions?: { skipped?: boolean } } };
    assert.equal(data.realestate?.transactions?.skipped, true);
  });
});

describe('Scenario: Regional Economy Full', () => {
  it('should validate prefectureCode format', async () => {
    const result = await regionalEconomyFull({ prefectureCode: 'invalid' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /must be a 2-digit code/);
  });

  it('should call multiple APIs in parallel', async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      // Dashboard mock
      if (url.hostname === 'dashboard.e-stat.go.jp') {
        return mockJsonResponse({ value: [] });
      }

      // BOJ mock (CSV)
      if (url.hostname === 'www.stat-search.boj.or.jp') {
        return new Response('Date,Value\n2024-01,100', {
          status: 200,
          headers: { 'content-type': 'text/csv' },
        });
      }

      return mockJsonResponse({});
    };

    const result = await regionalEconomyFull({ prefectureCode: '13', year: 2024 });
    assert.equal(result.success, true);

    const data = result.data as { prefecture?: { code?: string }; economy?: unknown };
    assert.equal(data.prefecture?.code, '13');
    assert.ok(data.economy);
  });
});

describe('Scenario: National Economy Summary', () => {
  it('should fetch national indicators', async () => {
    globalThis.fetch = async () =>
      mockJsonResponse({
        STATISTICAL_DATA: { DATA_INF: { NOTE: [], VALUE: [] } },
      });

    const result = await nationalEconomySummary();
    assert.equal(result.success, true);

    const data = result.data as { message?: string };
    assert.match(data.message || '', /全国経済サマリー/);
  });
});
