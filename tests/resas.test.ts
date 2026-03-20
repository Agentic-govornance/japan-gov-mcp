/**
 * RESAS API Tests — deprecated behavior verification
 * RESAS API は 2025-03-24 に提供終了。
 * 全関数が即座に提供終了エラーを返すことを検証する。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getPrefectures,
  getCities,
  getPopulation,
  getPopulationPyramid,
  getIndustryPower,
  getTourismForeigners,
  getMunicipalFinance,
  getPatents,
  getAgriCrops,
  type ResasConfig,
} from '../build/providers/resas.js';

const TEST_CONFIG: ResasConfig = { apiKey: 'test-key' };
const DEPRECATED_MSG = /2025-03-24/;

describe('RESAS deprecated — 全関数が提供終了エラーを返す', () => {
  it('getPrefectures should return deprecated error', async () => {
    const result = await getPrefectures(TEST_CONFIG);
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getCities should return deprecated error', async () => {
    const result = await getCities(TEST_CONFIG, { prefCode: 13 });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getPopulation should return deprecated error', async () => {
    const result = await getPopulation(TEST_CONFIG, { prefCode: 13, cityCode: '-' });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getPopulationPyramid should return deprecated error', async () => {
    const result = await getPopulationPyramid(TEST_CONFIG, {
      prefCode: 13, cityCode: '-', yearLeft: 2010, yearRight: 2020,
    });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getIndustryPower should return deprecated error', async () => {
    const result = await getIndustryPower(TEST_CONFIG, {
      prefCode: 13, cityCode: '-', sicCode: 'A', simcCode: '01',
    });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getTourismForeigners should return deprecated error', async () => {
    const result = await getTourismForeigners(TEST_CONFIG, { prefCode: 13 });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getMunicipalFinance should return deprecated error', async () => {
    const result = await getMunicipalFinance(TEST_CONFIG, {
      prefCode: 13, cityCode: '13101', matter: 1,
    });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getPatents should return deprecated error', async () => {
    const result = await getPatents(TEST_CONFIG, { prefCode: 13, cityCode: '-' });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('getAgriCrops should return deprecated error', async () => {
    const result = await getAgriCrops(TEST_CONFIG, { prefCode: 1, cityCode: '-' });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });

  it('deprecated error mentions alternative tools', async () => {
    const result = await getPrefectures(TEST_CONFIG);
    assert.match(result.error || '', /estat_search|dashboard_data/);
  });

  it('empty apiKey also returns deprecated error (not key error)', async () => {
    const result = await getPrefectures({ apiKey: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', DEPRECATED_MSG);
  });
});
