import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getPublicComments } from '../build/providers/pubcomment.js';
import { setupFetchMock, mockXmlResponse } from './helpers.ts';

setupFetchMock();

describe('パブリックコメントAPI', () => {
  it('getPublicComments should fetch list RSS by default', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /pcm_list\.xml$/);
      return mockXmlResponse('<?xml version="1.0"?><rss><channel><title>意見募集</title></channel></rss>');
    };

    const result = await getPublicComments({});
    assert.equal(result.success, true);
    assert.match(result.data || '', /意見募集/);
  });

  it('getPublicComments should fetch result RSS when type=result', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /pcm_result\.xml$/);
      return mockXmlResponse('<?xml version="1.0"?><rss><channel><title>結果公示</title></channel></rss>');
    };

    const result = await getPublicComments({ type: 'result' });
    assert.equal(result.success, true);
    assert.match(result.data || '', /結果公示/);
  });

  it('getPublicComments should include categoryCode in URL', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /pcm_list_0000000047\.xml$/);
      return mockXmlResponse('<?xml version="1.0"?><rss><channel></channel></rss>');
    };

    const result = await getPublicComments({ categoryCode: '0000000047' });
    assert.equal(result.success, true);
  });

  it('getPublicComments should fail when categoryCode is invalid', async () => {
    const result = await getPublicComments({ categoryCode: '123' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /categoryCode must be 10 digits/);
  });
});
