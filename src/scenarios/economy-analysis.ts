/**
 * 地域経済分析シナリオ
 * 統計ダッシュボードGDP + 日銀マクロ + e-Stat産業統計 + 国交省DPF
 */

import type { ApiResponse } from '../utils/http.js';
import { createError } from '../utils/http.js';
import { getDashboardData } from '../providers/dashboard.js';
import * as boj from '../providers/boj.js';
import * as estat from '../providers/estat.js';
import * as mlitDpf from '../providers/mlit-dpf.js';

/**
 * 地域経済総合分析
 */
export async function regionalEconomyFull(params: {
  prefectureCode: string;
  year?: number;
  estatAppId?: string;
  mlitDpfApiKey?: string;
}): Promise<ApiResponse<unknown>> {
  const source = 'Scenario/regional_economy_full';

  if (!params.prefectureCode?.trim() || !/^\d{2}$/.test(params.prefectureCode)) {
    return createError(source, 'prefectureCode must be a 2-digit code (01-47)');
  }

  const appId = params.estatAppId || process.env.ESTAT_APP_ID || '';
  const dpfKey = params.mlitDpfApiKey || process.env.MLIT_DPF_API_KEY || '';

  try {
    const tasks: Promise<{ label: string; result: ApiResponse }>[] = [];

    // 統計ダッシュボード: GDP
    tasks.push(
      getDashboardData({
        indicatorCode: 'C3101',
        regionCode: params.prefectureCode,
      }).then(r => ({ label: 'gdp', result: r }))
    );

    // 統計ダッシュボード: 人口
    tasks.push(
      getDashboardData({
        indicatorCode: 'A1101',
        regionCode: params.prefectureCode,
      }).then(r => ({ label: 'population', result: r }))
    );

    // 日銀マクロ: CPI
    tasks.push(
      boj.getTimeSeriesData({
        seriesCode: "PR01'PRCPI01",
        fromYear: (params.year || new Date().getFullYear()) - 5,
      }).then(r => ({ label: 'cpi', result: r }))
    );

    // e-Stat: 産業統計（オプション）
    if (appId) {
      tasks.push(
        estat.getStatsList({ appId }, {
          searchWord: '産業',
          statsField: '03',
          limit: 5,
        }).then(r => ({ label: 'industry', result: r }))
      );
    }

    // 国交省DPF（オプション）
    if (dpfKey) {
      tasks.push(
        mlitDpf.searchMlitDpf({ apiKey: dpfKey }, {
          term: `都道府県${params.prefectureCode} インフラ`,
          size: 5,
        }).then(r => ({ label: 'infrastructure', result: r }))
      );
    }

    const settled = await Promise.allSettled(tasks);
    const economy: Record<string, unknown> = {};
    const skipped: string[] = [];

    if (!appId) skipped.push('e-Stat産業統計 (ESTAT_APP_ID 未設定)');
    if (!dpfKey) skipped.push('国交省DPF (MLIT_DPF_API_KEY 未設定)');

    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { label, result } = s.value;
        economy[label] = result.success ? result.data : { error: result.error };
      }
    }

    const data: Record<string, unknown> = {
      prefecture: { code: params.prefectureCode },
      economy,
    };

    if (skipped.length > 0) data.skipped = skipped;

    return {
      success: true,
      data,
      source,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return createError(source, error instanceof Error ? error.message : String(error));
  }
}

/**
 * 全国経済サマリー
 * 統計ダッシュボードから全国の主要経済指標を一括取得
 */
export async function nationalEconomySummary(): Promise<ApiResponse<unknown>> {
  const source = 'Scenario/national_economy_summary';

  const indicators = [
    { code: 'A1101', name: '人口総数' },
    { code: 'C3101', name: '県内総生産' },
    { code: 'D3101', name: '完全失業率' },
    { code: 'E2101', name: '消費者物価指数' },
  ];

  try {
    const results = await Promise.allSettled(
      indicators.map(async (ind) => {
        const r = await getDashboardData({ indicatorCode: ind.code });
        return { ...ind, data: r.success ? r.data : { error: r.error } };
      })
    );

    const indicatorData = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<{ code: string; name: string; data: unknown }>).value);

    return {
      success: true,
      data: {
        message: '全国経済サマリー: 主要経済指標一括取得',
        indicators: indicatorData,
      },
      source,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return createError(source, error instanceof Error ? error.message : String(error));
  }
}
