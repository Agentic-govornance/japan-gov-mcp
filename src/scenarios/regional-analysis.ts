/**
 * 地域医療×経済 + 労働需給 シナリオ
 */

import type { ApiResponse } from '../utils/http.js';
import { createError } from '../utils/http.js';
import * as ndb from '../providers/ndb.js';
import * as boj from '../providers/boj.js';
import { getDashboardData } from '../providers/dashboard.js';
import { searchJobs } from '../providers/hellowork.js';
import type { HelloworkConfig } from '../providers/hellowork.js';

/**
 * 地域医療×マクロ経済 統合分析
 * NDB健診データ + 統計ダッシュボード人口 + 日銀マクロ指標
 */
export async function regionalHealthEconomy(params: {
  prefectureCode: string;
  year?: number;
}): Promise<ApiResponse<unknown>> {
  const source = 'Scenario/regional_health_economy';

  if (!params.prefectureCode?.trim() || !/^\d{2}$/.test(params.prefectureCode)) {
    return createError(source, 'prefectureCode must be a 2-digit code (01-47)');
  }

  try {
    const [healthResult, populationResult, macroResult] = await Promise.allSettled([
      // NDB健診データ (BMI分布)
      ndb.getInspectionStats({
        itemName: 'BMI',
        areaType: 'prefecture',
        prefectureName: params.prefectureCode,
      }),
      // 統計ダッシュボード: 人口総数
      getDashboardData({
        indicatorCode: 'A1101',
        regionCode: params.prefectureCode,
      }),
      // 日銀マクロ: CPI
      boj.getTimeSeriesData({
        seriesCode: "PR01'PRCPI01",
        fromYear: (params.year || new Date().getFullYear()) - 5,
        toYear: params.year || new Date().getFullYear(),
      }),
    ]);

    const extract = (r: PromiseSettledResult<ApiResponse>) =>
      r.status === 'fulfilled' && r.value.success
        ? r.value.data
        : { error: r.status === 'rejected' ? String(r.reason) : (r.value as ApiResponse).error };

    return {
      success: true,
      data: {
        prefecture: params.prefectureCode,
        health: extract(healthResult),
        population: extract(populationResult),
        macro: extract(macroResult),
      },
      source,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return createError(source, error instanceof Error ? error.message : String(error));
  }
}

/**
 * 労働市場 需給分析
 * ハローワーク求人 + e-Stat労働力調査
 */
export async function laborDemandSupply(params: {
  prefectureCode: string;
  occupation?: string;
  appId?: string;
}): Promise<ApiResponse<unknown>> {
  const source = 'Scenario/labor_demand_supply';

  if (!params.prefectureCode?.trim() || !/^\d{2}$/.test(params.prefectureCode)) {
    return createError(source, 'prefectureCode must be a 2-digit code (01-47)');
  }

  try {
    const helloworkKey = process.env.HELLOWORK_API_KEY || '';
    const estatAppId = params.appId || process.env.ESTAT_APP_ID || '';

    type LabeledResult = { label: string; result: ApiResponse };
    const tasks: Promise<LabeledResult>[] = [];

    // ハローワーク求人
    if (helloworkKey) {
      tasks.push(
        searchJobs({ apiKey: helloworkKey } as HelloworkConfig, {
          prefCode: params.prefectureCode,
          keyword: params.occupation,
        }).then(r => ({ label: 'vacancies', result: r }))
      );
    }

    // e-Stat労働力調査（appId提供時）
    if (estatAppId) {
      const estat = await import('../providers/estat.js');
      tasks.push(
        estat.getStatsList({ appId: estatAppId }, {
          searchWord: '労働力調査',
          statsField: '03',
          limit: 5,
        }).then(r => ({ label: 'laborStats', result: r }))
      );
    }

    const settled = await Promise.allSettled(tasks);
    const data: Record<string, unknown> = {
      prefecture: params.prefectureCode,
      occupation: params.occupation,
    };

    // Extract results
    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { label, result } = s.value;
        data[label] = result.success ? result.data : { error: result.error };
      }
    }

    // Mark skipped APIs
    if (!helloworkKey) {
      data.vacancies = { skipped: true, reason: 'HELLOWORK_API_KEY is not set' };
    }
    if (!estatAppId) {
      data.laborStats = { skipped: true, reason: 'ESTAT_APP_ID is not set' };
    }

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
