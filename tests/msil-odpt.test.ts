/**
 * MSIL (海しる) / ODPT プレースホルダ Tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getLayers, getFeatures } from '../build/providers/msil.js';
import { getRailwayTimetable, getBusTimetable } from '../build/providers/odpt.js';
import { setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('MSIL (海しる) API Placeholder', () => {
  it('getLayers should return error when API key is not set', async () => {
    const result = await getLayers({ apiKey: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /MSIL_API_KEY is not set/);
  });

  it('getFeatures should return error when API key is not set', async () => {
    const result = await getFeatures({ layerId: 'test-layer' }, { apiKey: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /MSIL_API_KEY is not set/);
  });

  it('getFeatures should return error when layerId is missing', async () => {
    const result = await getFeatures({ layerId: '' }, { apiKey: 'test-key' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /layerId is required/);
  });
});

describe('ODPT API Placeholder', () => {
  it('getRailwayTimetable should return error when API key is not set', async () => {
    const result = await getRailwayTimetable({}, { apiKey: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /ODPT_API_KEY is not set/);
  });

  it('getBusTimetable should return error when API key is not set', async () => {
    const result = await getBusTimetable({}, { apiKey: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /ODPT_API_KEY is not set/);
  });
});
