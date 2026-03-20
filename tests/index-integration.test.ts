/**
 * index.ts 統合テスト
 * - formatResponse のメタデータ表示
 * - DataQualityMeta付きレスポンスの整形
 * - 新ツールのスキーマ検証（zodバリデーション）
 * - TOOL_METADATAの新ツール登録確認
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ApiResponse, DataQualityMeta } from '../build/utils/http.js';

// http.ts のDataQualityMeta型をテスト
describe('DataQualityMeta type', () => {
  it('units フィールドを持てる', () => {
    const meta: DataQualityMeta = {
      units: { 'A1101': '人', 'D2201': '指数' },
    };
    assert.equal(meta.units?.['A1101'], '人');
  });

  it('surveyYear/surveyName フィールド', () => {
    const meta: DataQualityMeta = {
      surveyYear: '2020',
      surveyName: '国勢調査',
    };
    assert.equal(meta.surveyYear, '2020');
    assert.equal(meta.surveyName, '国勢調査');
  });

  it('suppressed フィールド', () => {
    const meta: DataQualityMeta = {
      suppressed: ['C610117', 'C620117'],
    };
    assert.equal(meta.suppressed?.length, 2);
  });

  it('mergerWarnings フィールド', () => {
    const meta: DataQualityMeta = {
      mergerWarnings: [
        { code: '35211', name: '長門市', message: '2005年合併' },
      ],
    };
    assert.equal(meta.mergerWarnings?.[0].code, '35211');
  });

  it('notes フィールド', () => {
    const meta: DataQualityMeta = {
      notes: ['単位は千円', '秘匿値あり'],
    };
    assert.equal(meta.notes?.length, 2);
  });

  it('全フィールドを同時に持てる', () => {
    const meta: DataQualityMeta = {
      units: { 'A1101': '人' },
      surveyYear: '2020',
      surveyName: '国勢調査',
      suppressed: ['C610117'],
      mergerWarnings: [{ code: '35211', name: '長門市', message: 'test' }],
      notes: ['注記'],
    };
    assert.ok(meta.units);
    assert.ok(meta.surveyYear);
    assert.ok(meta.surveyName);
    assert.ok(meta.suppressed);
    assert.ok(meta.mergerWarnings);
    assert.ok(meta.notes);
  });

  it('空オブジェクトも有効', () => {
    const meta: DataQualityMeta = {};
    assert.ok(meta);
  });
});

describe('ApiResponse with meta', () => {
  it('成功レスポンスにmetaを付与できる', () => {
    const res: ApiResponse = {
      success: true,
      data: { test: 1 },
      source: 'test',
      timestamp: new Date().toISOString(),
      meta: {
        units: { 'A1101': '人' },
        surveyYear: '2020',
      },
    };
    assert.ok(res.meta);
    assert.equal(res.meta.units?.['A1101'], '人');
  });

  it('エラーレスポンスにもmetaを付与できる', () => {
    const res: ApiResponse = {
      success: false,
      error: 'test error',
      source: 'test',
      timestamp: new Date().toISOString(),
      meta: {
        notes: ['エラー発生時の注記'],
      },
    };
    assert.ok(res.meta);
  });

  it('metaなしも互換性あり', () => {
    const res: ApiResponse = {
      success: true,
      data: { test: 1 },
      source: 'test',
      timestamp: new Date().toISOString(),
    };
    assert.equal(res.meta, undefined);
  });
});

// 新ツールのimportテスト（ユーティリティが正しくexportされているか）
describe('utility module exports', () => {
  it('ssds-registry: 全関数がexportされている', async () => {
    const mod = await import('../build/utils/ssds-registry.js');
    assert.ok(typeof mod.browseIndicators === 'function');
    assert.ok(typeof mod.getIndicatorInfo === 'function');
    assert.ok(typeof mod.getIndicatorUnit === 'function');
    assert.ok(typeof mod.getRelatedIndicators === 'function');
    assert.ok(typeof mod.getRecommendedCode === 'function');
    assert.ok(typeof mod.getTableIndicators === 'function');
    assert.ok(typeof mod.listSections === 'function');
  });

  it('metric-scope: 全関数がexportされている', async () => {
    const mod = await import('../build/utils/metric-scope.js');
    assert.ok(typeof mod.checkMetricsAvailability === 'function');
    assert.ok(typeof mod.getMetricUnit === 'function');
    assert.ok(typeof mod.getMetricDefinition === 'function');
    assert.ok(typeof mod.getUnitBySsdsCode === 'function');
    assert.ok(typeof mod.listMetrics === 'function');
    assert.ok(typeof mod.listMetricIds === 'function');
  });

  it('merger: 全関数がexportされている', async () => {
    const mod = await import('../build/utils/merger.js');
    assert.ok(typeof mod.getMergerInfo === 'function');
    assert.ok(typeof mod.checkMergerWarning === 'function');
    assert.ok(typeof mod.checkMergerWarnings === 'function');
    assert.ok(typeof mod.listMergers === 'function');
  });

  it('derived: 全関数がexportされている', async () => {
    const mod = await import('../build/utils/derived.js');
    assert.ok(typeof mod.safeDiv === 'function');
    assert.ok(typeof mod.pct === 'function');
    assert.ok(typeof mod.per10k === 'function');
    assert.ok(typeof mod.computeRankings === 'function');
    assert.ok(typeof mod.computeCorrelation === 'function');
    assert.ok(typeof mod.computeCorrelationMatrix === 'function');
    assert.ok(typeof mod.computeStandardDerived === 'function');
    assert.ok(typeof mod.alignTimeSeries === 'function');
  });
});

// ssds-registry と metric-scope の整合性
describe('cross-module consistency', () => {
  it('metric-scopeのssdsCodes がssds-registryに登録されている', async () => {
    const { listMetrics } = await import('../build/utils/metric-scope.js');
    const { getIndicatorInfo } = await import('../build/utils/ssds-registry.js');
    
    const metrics = listMetrics();
    for (const m of metrics) {
      if (m.ssdsCodes) {
        for (const code of m.ssdsCodes) {
          const info = getIndicatorInfo(code);
          assert.ok(info, `metric-scope指標${m.id}のssdsCodes=${code}がssds-registryに未登録`);
        }
      }
    }
  });

  it('metric-scopeとssds-registryの単位が一致', async () => {
    const { listMetrics } = await import('../build/utils/metric-scope.js');
    const { getIndicatorInfo } = await import('../build/utils/ssds-registry.js');
    
    const metrics = listMetrics();
    for (const m of metrics) {
      if (m.ssdsCodes) {
        for (const code of m.ssdsCodes) {
          const info = getIndicatorInfo(code);
          if (info) {
            assert.equal(info.unit, m.unit,
              `単位不一致: metric-scope ${m.id}=${m.unit}, ssds-registry ${code}=${info.unit}`);
          }
        }
      }
    }
  });

  it('metric-scopeとssds-registryのテーブルIDが一致', async () => {
    const { listMetrics } = await import('../build/utils/metric-scope.js');
    const { getIndicatorInfo } = await import('../build/utils/ssds-registry.js');
    
    const metrics = listMetrics();
    for (const m of metrics) {
      if (m.ssdsCodes && m.ssdsTable) {
        for (const code of m.ssdsCodes) {
          const info = getIndicatorInfo(code);
          if (info) {
            assert.equal(info.table, m.ssdsTable,
              `テーブル不一致: metric-scope ${m.id}=${m.ssdsTable}, ssds-registry ${code}=${info.table}`);
          }
        }
      }
    }
  });

  it('merger.tsの合併自治体コードが5桁', async () => {
    const { listMergers } = await import('../build/utils/merger.js');
    const all = listMergers();
    for (const m of all) {
      assert.equal(m.code.length, 5, `${m.name}(${m.code}): コードが5桁でない`);
      assert.ok(/^\d{5}$/.test(m.code), `${m.name}: コードが数字5桁でない: ${m.code}`);
    }
  });
});
