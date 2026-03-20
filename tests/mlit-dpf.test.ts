import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getMlitDpfCatalog, searchMlitDpf, type MlitDpfConfig } from '../build/providers/mlit-dpf.js';
import { setupFetchMock } from './helpers.ts';

const TEST_CONFIG: MlitDpfConfig = { apiKey: 'test-mlit-dpf-key' };

setupFetchMock();

/** Local mock with statusText support (not available in shared helper) */
function mockJsonResponse(body: unknown, status = 200, statusText = 'OK'): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  });
}

describe('国交省DPF API', () => {
  describe('searchMlitDpf', () => {
    it('should execute GraphQL search query', async () => {
      globalThis.fetch = async (input, init) => {
        assert.equal(String(input), 'https://www.mlit-data.jp/api/v1/');
        assert.equal(init?.method, 'POST');
        assert.equal((init?.headers as Record<string, string>)['Content-Type'], 'application/json');
        assert.equal((init?.headers as Record<string, string>).apikey, 'test-mlit-dpf-key');

        const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
        assert.match(body.query, /search\(term:\s*\$term/);
        assert.match(body.query, /totalNumber/);
        assert.match(body.query, /searchResults/);
        assert.equal(body.variables.term, '橋梁');
        assert.equal(body.variables.first, 0);
        assert.equal(body.variables.size, 10);

        return mockJsonResponse({
          data: {
            search: {
              totalNumber: 1,
              searchResults: [{ id: 'abc', title: '橋梁点検データ' }],
            },
          },
        });
      };

      const result = await searchMlitDpf(TEST_CONFIG, { term: '橋梁' });
      assert.equal(result.success, true);
      assert.equal((result.data as any)?.search?.totalNumber, 1);
      assert.equal(result.source, '国交省DPF/search');
    });

    it('should fail when api key is missing', async () => {
      const result = await searchMlitDpf({ apiKey: '' }, { term: '道路' });
      assert.equal(result.success, false);
      assert.match(result.error || '', /MLIT_DPF_API_KEY is required/);
    });

    it('should validate size range 1-100', async () => {
      const low = await searchMlitDpf(TEST_CONFIG, { term: '河川', size: 0 });
      assert.equal(low.success, false);
      assert.match(low.error || '', /size must be an integer between 1 and 100/);

      const high = await searchMlitDpf(TEST_CONFIG, { term: '河川', size: 101 });
      assert.equal(high.success, false);
      assert.match(high.error || '', /size must be an integer between 1 and 100/);
    });
  });

  describe('getMlitDpfCatalog', () => {
    it('should execute GraphQL catalog query', async () => {
      globalThis.fetch = async (input, init) => {
        assert.equal(String(input), 'https://www.mlit-data.jp/api/v1/');
        assert.equal(init?.method, 'POST');
        const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
        assert.match(body.query, /dataCatalog\(IDs:\s*\$id\)/);
        assert.match(body.query, /description/);
        assert.match(body.query, /modified/);
        assert.equal(body.variables.id, 'catalog-001');

        return mockJsonResponse({
          data: {
            dataCatalog: {
              id: 'catalog-001',
              title: 'テストカタログ',
            },
          },
        });
      };

      const result = await getMlitDpfCatalog(TEST_CONFIG, { id: 'catalog-001' });
      assert.equal(result.success, true);
      assert.equal((result.data as any)?.dataCatalog?.id, 'catalog-001');
      assert.equal(result.source, '国交省DPF/catalog');
    });

    it('should fail when id is missing', async () => {
      const result = await getMlitDpfCatalog(TEST_CONFIG, { id: '' });
      assert.equal(result.success, false);
      assert.match(result.error || '', /id is required/);
    });
  });

  it('should handle HTTP 500 errors', async () => {
    globalThis.fetch = async () => mockJsonResponse({ error: 'server failed' }, 500, 'Internal Server Error');

    const result = await searchMlitDpf(TEST_CONFIG, { term: '港湾' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /HTTP 500: Internal Server Error/);
  });
});
