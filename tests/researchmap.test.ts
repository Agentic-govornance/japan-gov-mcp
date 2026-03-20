import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getResearcherAchievements } from '../build/providers/researchmap.js';
import { setupFetchMock, mockJsonResponse } from './helpers.ts';

setupFetchMock();

describe('researchmap研究者情報API', () => {
  it('getResearcherAchievements should fetch achievements JSON-LD', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /api\.researchmap\.jp\/TestResearcher\/published_papers/);
      return mockJsonResponse({ '@context': 'http://schema.org', items: [] });
    };

    const result = await getResearcherAchievements({
      permalink: 'TestResearcher',
      achievementType: 'published_papers',
    });
    assert.equal(result.success, true);
  });

  it('getResearcherAchievements should include limit and start params', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('limit'), '5');
      assert.equal(url.searchParams.get('start'), '10');
      return mockJsonResponse({ items: [] });
    };

    const result = await getResearcherAchievements({
      permalink: 'TestResearcher',
      achievementType: 'awards',
      limit: 5,
      start: 10,
    });
    assert.equal(result.success, true);
  });

  it('getResearcherAchievements should fail when permalink is empty', async () => {
    const result = await getResearcherAchievements({
      permalink: '',
      achievementType: 'published_papers',
    });
    assert.equal(result.success, false);
    assert.match(result.error || '', /permalink is required/);
  });

  it('getResearcherAchievements should fail when achievementType is empty', async () => {
    const result = await getResearcherAchievements({
      permalink: 'TestResearcher',
      achievementType: '',
    });
    assert.equal(result.success, false);
    assert.match(result.error || '', /achievementType is required/);
  });
});
