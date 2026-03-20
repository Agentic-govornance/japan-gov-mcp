/**
 * 不動産×人口動態分析シナリオ
 * 不動産取引価格・地価公示・人口統計を統合して地域市場を分析
 */

import type { ApiResponse } from '../utils/http.js';
import { createError } from '../utils/http.js';
import { getRealEstateTransactions, getLandPrice } from '../providers/realestate.js';
import type { RealEstateConfig } from '../providers/realestate.js';
import { getDashboardData } from '../providers/dashboard.js';

/**
 * 不動産×人口動態分析
 * @param params - 分析パラメータ
 */
export async function realestateDemographics(params: {
  prefecture?: string;    // 都道府県コード2桁（例: "13" = 東京都）
  city?: string;          // 市区町村コード5桁（例: "13101" = 千代田区）
  year?: number;          // 分析年（不動産取引データ）
  quarter?: number;       // 四半期（1-4）
  realestateApiKey?: string; // 不動産情報APIキー
}): Promise<ApiResponse<unknown>> {
  const source = 'Scenario/realestate_demographics';

  if (!params.prefecture && !params.city) {
    return createError(source, 'prefecture or city is required');
  }

  const areaCode = params.city || params.prefecture;
  const year = params.year || new Date().getFullYear() - 1; // デフォルト: 昨年
  const quarter = params.quarter || 1;

  try {
    // 並列取得: 不動産取引 + 地価公示 + 人口統計
    const [transactionResult, landPriceResult, populationResult] = await Promise.allSettled([
      // 1. 不動産取引価格情報
      params.realestateApiKey
        ? getRealEstateTransactions(
            { apiKey: params.realestateApiKey } as RealEstateConfig,
            {
              year: year.toString(),
              quarter: quarter.toString(),
              area: areaCode,
            }
          )
        : Promise.resolve({
            success: false,
            error: 'REALESTATE_API_KEY is not set',
          } as ApiResponse),

      // 2. 地価公示
      params.realestateApiKey
        ? getLandPrice(
            { apiKey: params.realestateApiKey } as RealEstateConfig,
            {
              year: year.toString(),
              area: areaCode,
            }
          )
        : Promise.resolve({
            success: false,
            error: 'REALESTATE_API_KEY is not set',
          } as ApiResponse),

      // 3. 統計ダッシュボード: 人口総数
      getDashboardData({
        indicatorCode: 'A1101', // 人口総数
        regionCode: areaCode,
      }),
    ]);

    // 結果統合
    const result: Record<string, unknown> = {
      area: {
        code: areaCode,
        type: params.city ? 'city' : 'prefecture',
      },
      period: {
        year,
        quarter,
      },
      realestate: {
        transactions:
          transactionResult.status === 'fulfilled' && transactionResult.value.success
            ? transactionResult.value.data
            : {
                skipped: true,
                reason:
                  transactionResult.status === 'rejected'
                    ? String(transactionResult.reason)
                    : (transactionResult.value as ApiResponse).error,
              },
        landPrice:
          landPriceResult.status === 'fulfilled' && landPriceResult.value.success
            ? landPriceResult.value.data
            : {
                skipped: true,
                reason:
                  landPriceResult.status === 'rejected'
                    ? String(landPriceResult.reason)
                    : (landPriceResult.value as ApiResponse).error,
              },
      },
      demographics: {
        population:
          populationResult.status === 'fulfilled' && populationResult.value.success
            ? populationResult.value.data
            : {
                error:
                  populationResult.status === 'rejected'
                    ? String(populationResult.reason)
                    : (populationResult.value as ApiResponse).error,
              },
      },
    };

    return {
      success: true,
      data: result,
      source,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return createError(source, error instanceof Error ? error.message : String(error));
  }
}
