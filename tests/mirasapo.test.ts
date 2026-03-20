import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchCaseStudies,
  getCaseStudy,
  getCategories,
  getRegions,
} from '../build/providers/mirasapo.js';
import { mockJsonResponse, setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('ミラサポplus事例情報API', () => {
  it('searchCaseStudies should fetch with default params', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://mirasapo-plus.go.jp');
      assert.match(url.pathname, /\/jirei-api\/case_studies/);
      assert.equal(url.searchParams.get('limit'), '10');
      return mockJsonResponse({ total: 100, items: [{ id: '1', title: '事例1' }] });
    };

    const result = await searchCaseStudies({});
    assert.equal(result.success, true);
    assert.equal((result.data as { total?: number })?.total, 100);
  });

  it('searchCaseStudies should pass keywords and prefecture', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('keywords'), 'IT導入');
      assert.equal(url.searchParams.get('prefecture.name'), '東京都');
      assert.equal(url.searchParams.get('limit'), '20');
      return mockJsonResponse({ total: 5, items: [] });
    };

    const result = await searchCaseStudies({
      keywords: 'IT導入',
      prefecture: '東京都',
      limit: 20,
    });
    assert.equal(result.success, true);
  });

  it('searchCaseStudies should pass industry and purpose categories', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('industry_category'), '1');
      assert.equal(url.searchParams.get('purpose_category'), '3');
      return mockJsonResponse({ total: 10, items: [] });
    };

    const result = await searchCaseStudies({
      industryCategory: '1',
      purposeCategory: '3',
    });
    assert.equal(result.success, true);
  });

  it('searchCaseStudies should clamp limit to 1-100', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('limit'), '100');
      return mockJsonResponse({ total: 0, items: [] });
    };

    const result = await searchCaseStudies({ limit: 999 });
    assert.equal(result.success, true);
  });

  it('getCaseStudy should fetch by id', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /\/case_studies\/42$/);
      return mockJsonResponse({ id: '42', title: '成功事例' });
    };

    const result = await getCaseStudy({ id: '42' });
    assert.equal(result.success, true);
    assert.equal((result.data as { title?: string })?.title, '成功事例');
  });

  it('getCaseStudy should fail when id is empty', async () => {
    const result = await getCaseStudy({ id: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /id is required/);
  });

  it('getCategories should fetch industries', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /\/categories\/industries$/);
      return mockJsonResponse([{ id: '1', name: '農業，林業' }]);
    };

    const result = await getCategories({ type: 'industries' });
    assert.equal(result.success, true);
    assert.equal(Array.isArray(result.data), true);
  });

  it('getCategories should fetch purposes', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /\/categories\/purposes$/);
      return mockJsonResponse([{ id: '1', name: '販路開拓' }]);
    };

    const result = await getCategories({ type: 'purposes' });
    assert.equal(result.success, true);
  });

  it('getCategories should fail with invalid type', async () => {
    const result = await getCategories({ type: 'invalid' as any });
    assert.equal(result.success, false);
    assert.match(result.error || '', /type must be one of/);
  });

  it('getRegions should fetch regions with prefectures', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /\/regions$/);
      return mockJsonResponse([
        { id: '1', name: '北海道地方', prefectures: [{ id: '1', name: '北海道' }] },
      ]);
    };

    const result = await getRegions();
    assert.equal(result.success, true);
    assert.equal(Array.isArray(result.data), true);
  });
});
