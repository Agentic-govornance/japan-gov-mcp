import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { searchKkj } from '../build/providers/kkj.js';
import { setupFetchMock, mockXmlResponse } from './helpers.ts';

setupFetchMock();

describe('官公需情報ポータルAPI', () => {
  it('searchKkj should fetch XML with expected query params', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.origin, 'https://www.kkj.go.jp');
      assert.equal(url.pathname, '/api/');
      assert.equal(url.searchParams.get('Query'), 'クラウド');
      assert.equal(url.searchParams.get('Project_Name'), 'システム開発');
      assert.equal(url.searchParams.get('Organization_Name'), 'デジタル庁');
      assert.equal(url.searchParams.get('Count'), '100');
      assert.equal(url.searchParams.get('Start'), '21');
      return mockXmlResponse('<?xml version="1.0"?><result><count>1</count></result>');
    };

    const result = await searchKkj({
      Query: 'クラウド',
      Project_Name: 'システム開発',
      Organization_Name: 'デジタル庁',
      Count: 100,
      Start: 21,
    });

    assert.equal(result.success, true);
    assert.match(result.data || '', /<result>/);
  });

  it('searchKkj should fail when CFT_Issue_Date format is invalid', async () => {
    const result = await searchKkj({ CFT_Issue_Date: '2024-01-01' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /CFT_Issue_Date must be YYYY-MM-DD\/YYYY-MM-DD/);
  });

  it('searchKkj should fail when Count is out of range', async () => {
    const result = await searchKkj({ Count: 1001 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /Count must be an integer between 1 and 1000/);
  });

  it('searchKkj should fail when Start is out of range', async () => {
    const result = await searchKkj({ Start: 0 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /Start must be an integer between 1 and 1000000/);
  });

  it('searchKkj should handle HTTP error', async () => {
    globalThis.fetch = async () => new Response('error', { status: 500, statusText: 'Server Error' });
    const result = await searchKkj({ Query: 'ネットワーク' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 500/);
  });
});
