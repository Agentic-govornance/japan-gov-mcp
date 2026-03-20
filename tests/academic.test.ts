import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  searchNdl,
  searchJstage,
  searchJapanSearch,
  searchCinii,
  searchIrdb,
} from '../build/providers/academic.js';
import { setupFetchMock, mockJsonResponse, mockXmlResponse } from './helpers.ts';

setupFetchMock();

describe('図書・論文・学術API', () => {
  it('searchNdl should fetch OpenSearch XML with default count', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://ndlsearch.ndl.go.jp');
      assert.equal(url.pathname, '/api/opensearch');
      assert.equal(url.searchParams.get('any'), '生成AI');
      assert.equal(url.searchParams.get('cnt'), '20');
      return mockXmlResponse('<?xml version="1.0"?><rss><channel></channel></rss>');
    };

    const result = await searchNdl({ query: '生成AI' });
    assert.equal(result.success, true);
    assert.match(result.data || '', /<rss>/);
  });

  it('searchNdl should fail when query is empty', async () => {
    const result = await searchNdl({ query: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /query is required/);
  });

  it('searchJstage should fetch XML with default count and start', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://api.jstage.jst.go.jp');
      assert.equal(url.pathname, '/searchapi/do');
      assert.equal(url.searchParams.get('service'), '3');
      assert.equal(url.searchParams.get('article'), '機械学習');
      assert.equal(url.searchParams.get('count'), '20');
      assert.equal(url.searchParams.get('start'), '1');
      return mockXmlResponse('<?xml version="1.0"?><result></result>');
    };

    const result = await searchJstage({ query: '機械学習' });
    assert.equal(result.success, true);
    assert.match(result.data || '', /<result>/);
  });

  it('searchJstage should include optional publication year filters', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('article'), '統計');
      assert.equal(url.searchParams.get('count'), '5');
      assert.equal(url.searchParams.get('start'), '11');
      assert.equal(url.searchParams.get('pubyearfrom'), '2020');
      assert.equal(url.searchParams.get('pubyearto'), '2024');
      return mockXmlResponse('<?xml version="1.0"?><result></result>');
    };

    const result = await searchJstage({
      query: '統計',
      count: 5,
      start: 11,
      pubyearfrom: '2020',
      pubyearto: '2024',
    });
    assert.equal(result.success, true);
  });

  it('searchJstage should fail when query is blank', async () => {
    const result = await searchJstage({ query: '   ' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /query is required/);
  });

  it('searchJapanSearch should fetch JSON with default size/from', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://jpsearch.go.jp');
      assert.equal(url.pathname, '/api/item/search/jps-cross');
      assert.equal(url.searchParams.get('keyword'), '浮世絵');
      assert.equal(url.searchParams.get('size'), '20');
      assert.equal(url.searchParams.get('from'), '0');
      return mockJsonResponse({ total: 1, list: [{ id: 'x1' }] });
    };

    const result = await searchJapanSearch({ keyword: '浮世絵' });
    assert.equal(result.success, true);
    assert.equal((result.data as { total?: number })?.total, 1);
  });

  it('searchJapanSearch should pass custom size/from', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('keyword'), '古地図');
      assert.equal(url.searchParams.get('size'), '7');
      assert.equal(url.searchParams.get('from'), '14');
      return mockJsonResponse({ total: 25, list: [] });
    };

    const result = await searchJapanSearch({ keyword: '古地図', size: 7, from: 14 });
    assert.equal(result.success, true);
  });

  it('searchJapanSearch should fail when keyword is empty', async () => {
    const result = await searchJapanSearch({ keyword: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /keyword is required/);
  });

  it('searchCinii should fetch JSON with default count/format', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://cir.nii.ac.jp');
      assert.equal(url.pathname, '/opensearch/articles');
      assert.equal(url.searchParams.get('q'), '自然言語処理');
      assert.equal(url.searchParams.get('count'), '20');
      assert.equal(url.searchParams.get('format'), 'json');
      return mockJsonResponse({ opensearch: { totalResults: 1 } });
    };

    const result = await searchCinii({ query: '自然言語処理' });
    assert.equal(result.success, true);
    assert.equal((result.data as { opensearch?: { totalResults?: number } })?.opensearch?.totalResults, 1);
  });

  it('searchCinii should fail when query is empty', async () => {
    const result = await searchCinii({ query: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /query is required/);
  });

  it('searchIrdb should fetch OpenSearch XML with query', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://irdb.nii.ac.jp');
      assert.equal(url.pathname, '/opensearch/search');
      assert.equal(url.searchParams.get('q'), '量子コンピュータ');
      assert.equal(url.searchParams.get('count'), '20');
      return mockXmlResponse('<?xml version="1.0"?><feed><entry></entry></feed>');
    };

    const result = await searchIrdb({ query: '量子コンピュータ' });
    assert.equal(result.success, true);
    assert.match(result.data || '', /<feed>/);
  });

  it('searchIrdb should accept title and author params', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('title'), '機械学習');
      assert.equal(url.searchParams.get('creator'), '田中太郎');
      assert.equal(url.searchParams.get('count'), '10');
      return mockXmlResponse('<?xml version="1.0"?><feed></feed>');
    };

    const result = await searchIrdb({ title: '機械学習', author: '田中太郎', count: 10 });
    assert.equal(result.success, true);
  });

  it('searchIrdb should fail when no search params provided', async () => {
    const result = await searchIrdb({});
    assert.equal(result.success, false);
    assert.match(result.error || '', /query, title, or author is required/);
  });
});
