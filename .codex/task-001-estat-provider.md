# Task 001: e-Stat Provider 本番品質化

## 目的
e-Stat API v3.0 Provider を実API仕様に完全準拠させ、テストを作成する。

## 参照すべきファイル
- `src/providers/estat.ts` — 現在の実装
- `src/utils/http.ts` — HTTP ユーティリティ
- `docs/API_CATALOG.md` — エンドポイント仕様

## API仕様
- 公式: https://www.e-stat.go.jp/api/api-info/e-stat-manual3-0
- Base URL: `https://api.e-stat.go.jp/rest/3.0/app/json/`
- 認証: `appId` クエリパラメータ

## 作成すべきファイル

### 1. `src/providers/estat.ts` の改善点

```typescript
// 追加すべきレスポンス型定義
interface EStatStatsListResponse {
  GET_STATS_LIST: {
    RESULT: { STATUS: number; ERROR_MSG: string; DATE: string };
    PARAMETER: { /* リクエストパラメータのエコーバック */ };
    DATALIST_INF: {
      NUMBER: number;  // 総件数
      RESULT_INF: { FROM_NUMBER: number; TO_NUMBER: number };
      TABLE_INF: Array<{
        '@id': string;             // 統計表ID
        STAT_NAME: { '@code': string; '$': string };
        GOV_ORG: { '@code': string; '$': string };
        STATISTICS_NAME: string;
        TITLE: { '@no': string; '$': string };
        CYCLE: string;
        SURVEY_DATE: string;
        OPEN_DATE: string;
        SMALL_AREA: number;
        MAIN_CATEGORY: { '@code': string; '$': string };
        SUB_CATEGORY: { '@code': string; '$': string };
        OVERALL_TOTAL_NUMBER: number;
        UPDATED_DATE: string;
      }>;
    };
  };
}

// 追加すべきエンドポイント: refineSearch
export async function refineSearch(config: EStatConfig, params: {
  statsDataId: string;
  // ... 絞り込み条件
}): Promise<ApiResponse<any>> { ... }
```

### 2. `tests/estat.test.ts`

```typescript
import { describe, it, expect } from 'node:test';
// または vitest

describe('e-Stat Provider', () => {
  describe('getStatsList', () => {
    it('should search statistics by keyword', async () => { ... });
    it('should handle empty results', async () => { ... });
    it('should respect limit parameter', async () => { ... });
  });

  describe('getMetaInfo', () => {
    it('should return meta information for valid statsDataId', async () => { ... });
    it('should handle invalid statsDataId', async () => { ... });
  });

  describe('getStatsData', () => {
    it('should fetch statistical data', async () => { ... });
    it('should handle pagination', async () => { ... });
    it('should filter by time/area/category', async () => { ... });
  });
});
```

## 検証基準
- [ ] TypeScript strict mode でコンパイルエラーなし
- [ ] 全エンドポイントの型定義が完全
- [ ] appId未設定時のエラーハンドリング
- [ ] HTTP エラー時の適切なレスポンス
- [ ] テストが全てパス
- [ ] `console.log` が含まれていない

## 補足
e-Stat はこの MCP の中核。ここの品質が全体の品質を決める。
getStatsData のレスポンスは VALUE 配列が巨大になりうるので、
limit のデフォルト値（100）は適切か検討すること。
