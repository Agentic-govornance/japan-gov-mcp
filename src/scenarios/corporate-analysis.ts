/**
 * 企業情報統合分析シナリオ
 * 法人番号 + gBizINFO + EDINET を統合
 */

import type { ApiResponse } from '../utils/http.js';
import { createError } from '../utils/http.js';
import * as houjin from '../providers/houjin.js';
import * as gbiz from '../providers/gbiz.js';
import * as edinet from '../providers/edinet.js';

/**
 * 企業情報統合分析
 */
export async function corporateIntelligence(params: {
  companyName?: string;
  corporateNumber?: string;
  houjinAppId?: string;
  gbizToken?: string;
  edinetApiKey?: string;
}): Promise<ApiResponse<unknown>> {
  const source = 'Scenario/corporate_intelligence';

  if (!params.companyName && !params.corporateNumber) {
    return createError(source, 'companyName or corporateNumber is required');
  }

  const houjinAppId = params.houjinAppId || process.env.HOUJIN_APP_ID || '';
  const gbizToken = params.gbizToken || process.env.GBIZ_TOKEN || '';
  const edinetApiKey = params.edinetApiKey || process.env.EDINET_API_KEY || '';

  try {
    const tasks: Promise<{ label: string; result: ApiResponse }>[] = [];

    // 1. 法人番号検索
    if (houjinAppId) {
      tasks.push(
        houjin.searchHoujin({ appId: houjinAppId }, {
          name: params.companyName,
          number: params.corporateNumber,
        }).then(r => ({ label: 'houjin', result: r }))
      );
    }

    // 2. gBizINFO検索
    if (gbizToken) {
      tasks.push(
        gbiz.searchCorporation({ token: gbizToken }, {
          name: params.companyName,
          corporateNumber: params.corporateNumber,
        }).then(r => ({ label: 'gbiz', result: r }))
      );
    }

    // 3. EDINET (直近の開示書類)
    if (edinetApiKey) {
      const today = new Date().toISOString().slice(0, 10);
      tasks.push(
        edinet.getDocumentList({ apiKey: edinetApiKey }, {
          date: today,
          type: 2,
        }).then(r => ({ label: 'edinet', result: r }))
      );
    }

    // If no API keys at all, return skipped
    if (!houjinAppId && !gbizToken && !edinetApiKey && tasks.length === 0) {
      return {
        success: true,
        data: {
          companyName: params.companyName,
          corporateNumber: params.corporateNumber,
          skipped: true,
          reason: 'No API keys configured (HOUJIN_APP_ID, GBIZ_TOKEN, EDINET_API_KEY)',
        },
        source,
        timestamp: new Date().toISOString(),
      };
    }

    const settled = await Promise.allSettled(tasks);
    const data: Record<string, unknown> = {
      companyName: params.companyName,
      corporateNumber: params.corporateNumber,
    };
    const skippedApis: string[] = [];

    if (!houjinAppId) skippedApis.push('法人番号 (HOUJIN_APP_ID 未設定)');
    if (!gbizToken) skippedApis.push('gBizINFO (GBIZ_TOKEN 未設定)');
    if (!edinetApiKey) skippedApis.push('EDINET (EDINET_API_KEY 未設定)');

    for (const s of settled) {
      if (s.status === 'fulfilled') {
        const { label, result } = s.value;
        data[label] = result.success ? result.data : { error: result.error };
      }
    }

    if (skippedApis.length > 0) {
      data.skippedApis = skippedApis;
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
