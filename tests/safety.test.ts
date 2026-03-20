import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getSafetyInfo } from '../build/providers/safety.js';
import { setupFetchMock, mockXmlResponse } from './helpers.ts';

setupFetchMock();

describe('海外安全情報', () => {
  it('getSafetyInfo should fetch all regions XML', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /ezairyu\.mofa\.go\.jp\/opendata\/area\/00\.xml/);
      return mockXmlResponse('<?xml version="1.0"?><opendata><area><cd>00</cd></area></opendata>');
    };
    const result = await getSafetyInfo({});
    assert.equal(result.success, true);
  });

  it('getSafetyInfo should fetch by regionCode', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /opendata\/area\/10\.xml/);
      return mockXmlResponse('<?xml version="1.0"?><opendata><area><cd>10</cd></area></opendata>');
    };
    const result = await getSafetyInfo({ regionCode: '10' });
    assert.equal(result.success, true);
  });

  it('getSafetyInfo should fetch by countryCode', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /opendata\/country\/0001\.xml/);
      return mockXmlResponse('<?xml version="1.0"?><opendata></opendata>');
    };
    const result = await getSafetyInfo({ countryCode: '0001' });
    assert.equal(result.success, true);
  });
});

describe('HTTP error handling (safety)', () => {
  it('should handle network error', async () => {
    globalThis.fetch = async () => { throw new Error('Network unreachable'); };
    const result = await getSafetyInfo({});
    assert.equal(result.success, false);
    assert.match(result.error || '', /Network unreachable/);
  });
});
