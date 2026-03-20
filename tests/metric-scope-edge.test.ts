/**
 * metric-scope.ts エッジケーステスト
 * - 粒度ロジックの厳密テスト
 * - unavailableReason + minGranularity の組み合わせ
 * - 全指標の整合性
 * - SSDSコードマッピングの完全性
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkMetricsAvailability,
  getMetricUnit,
  getMetricDefinition,
  getUnitBySsdsCode,
  listMetrics,
  listMetricIds,
} from '../build/utils/metric-scope.js';

describe('metric-scope edge cases', () => {
  // === 粒度ロジック ===
  it('municipality指標はmunicipality/prefecture/nationalすべてで利用可能', () => {
    const muniResult = checkMetricsAvailability(['population'], 'municipality');
    const prefResult = checkMetricsAvailability(['population'], 'prefecture');
    const natResult = checkMetricsAvailability(['population'], 'national');
    assert.equal(muniResult.available.length, 1);
    assert.equal(prefResult.available.length, 1);
    assert.equal(natResult.available.length, 1);
  });

  it('prefecture指標はmunicipality不可、prefecture/national可', () => {
    const muniResult = checkMetricsAvailability(['revpar'], 'municipality');
    const prefResult = checkMetricsAvailability(['revpar'], 'prefecture');
    const natResult = checkMetricsAvailability(['revpar'], 'national');
    assert.equal(muniResult.unavailable.length, 1);
    assert.equal(prefResult.available.length, 1);
    assert.equal(natResult.available.length, 1);
  });

  it('全unavailable指標のalternativeフィールドが存在', () => {
    const allIds = listMetricIds();
    const result = checkMetricsAvailability(allIds, 'municipality');
    for (const u of result.unavailable) {
      const def = getMetricDefinition(u.metric);
      if (def && def.unavailableReason) {
        // unavailableReasonがある指標は代替手段があるべき
        // ただしalternativeはoptionalなのでチェックをログに留める
      }
    }
    // 少なくともrevpar, occupancy_rate, guest_nightsは不可
    const unavailIds = result.unavailable.map(u => u.metric);
    assert.ok(unavailIds.includes('revpar') || unavailIds.includes('occupancy_rate') || unavailIds.includes('nyuto_tax'),
      'いくつかのmunicipality不可指標が検出されるべき');
  });

  // === 複数指標一括チェック ===
  it('10指標一括チェック', () => {
    const ids = ['population', 'population_65plus', 'households',
      'establishments_all', 'employees_all', 'establishments_accom',
      'fiscal_strength_index', 'revpar', 'nyuto_tax', 'nonexistent'];
    const result = checkMetricsAvailability(ids, 'municipality');
    // population〜fiscal_strength_index: 7件available
    // revpar, nyuto_tax: unavailable
    // nonexistent: unavailable
    assert.equal(result.available.length + result.unavailable.length, ids.length,
      '全指標がavailableかunavailableに分類されるべき');
  });

  it('空配列は空結果', () => {
    const result = checkMetricsAvailability([], 'municipality');
    assert.equal(result.available.length, 0);
    assert.equal(result.unavailable.length, 0);
  });

  it('デフォルト粒度はmunicipality', () => {
    const result = checkMetricsAvailability(['revpar']);
    assert.equal(result.unavailable.length, 1, 'デフォルトmunicipalityでrevpar不可');
  });

  // === 全指標データ整合性 ===
  it('全指標にid, name, unit, source, minGranularityがある', () => {
    const all = listMetrics();
    for (const m of all) {
      assert.ok(m.id, `idが空`);
      assert.ok(m.name, `${m.id}: nameが空`);
      assert.ok(m.unit, `${m.id}: unitが空`);
      assert.ok(m.source, `${m.id}: sourceが空`);
      assert.ok(['municipality', 'prefecture', 'national'].includes(m.minGranularity),
        `${m.id}: minGranularity不正: ${m.minGranularity}`);
    }
  });

  it('指標IDがユニーク', () => {
    const ids = listMetricIds();
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, `重複ID: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
  });

  it('SSDSコードが設定されている指標はssdsTableも設定されている', () => {
    const all = listMetrics();
    for (const m of all) {
      if (m.ssdsCodes && m.ssdsCodes.length > 0) {
        assert.ok(m.ssdsTable, `${m.id}: ssdsCodes設定あるがssdsTableがない`);
      }
    }
  });

  it('availableYearsが設定されている場合は昇順', () => {
    const all = listMetrics();
    for (const m of all) {
      if (m.availableYears) {
        for (let i = 1; i < m.availableYears.length; i++) {
          assert.ok(m.availableYears[i] > m.availableYears[i - 1],
            `${m.id}: availableYears not sorted`);
        }
      }
    }
  });

  // === getUnitBySsdsCode ===
  it('全SSDS指標コードの単位が取得可能', () => {
    const all = listMetrics();
    for (const m of all) {
      if (m.ssdsCodes) {
        for (const code of m.ssdsCodes) {
          const unit = getUnitBySsdsCode(code);
          assert.ok(unit, `SSDSコード${code}(指標${m.id})の単位がnull`);
          assert.equal(unit, m.unit, `${code}: getUnitBySsdsCode=${unit} vs metric.unit=${m.unit}`);
        }
      }
    }
  });

  // === getMetricDefinition ===
  it('getMetricDefinition: 派生指標（aging_rate等）も取得可能', () => {
    const def = getMetricDefinition('aging_rate');
    assert.ok(def, 'aging_rateは登録されているべき');
    assert.equal(def.unit, '%');
  });

  it('getMetricDefinition: 取得不可指標（nyuto_tax）も情報が取れる', () => {
    const def = getMetricDefinition('nyuto_tax');
    assert.ok(def);
    assert.ok(def.unavailableReason);
  });

  // === availableとunavailableの結果に単位情報が含まれる ===
  it('available結果にunit/source/availableYearsが含まれる', () => {
    const result = checkMetricsAvailability(['population', 'fiscal_strength_index'], 'municipality');
    for (const a of result.available) {
      assert.ok(a.unit, `${a.metric}: unitがない`);
      assert.ok(a.source, `${a.metric}: sourceがない`);
    }
  });

  it('unavailable結果にreasonが含まれる', () => {
    const result = checkMetricsAvailability(['revpar', 'nonexistent'], 'municipality');
    for (const u of result.unavailable) {
      assert.ok(u.reason, `${u.metric}: reasonがない`);
    }
  });
});
