# Task 002: RESAS Provider 本番品質化

## 目的
RESAS API v1 の全カテゴリをカバーし、テストを作成する。

## 参照ファイル
- `src/providers/resas.ts`
- API仕様: https://opendata.resas-portal.go.jp/docs/api/v1/index.html

## 作成すべきファイル
- `src/providers/resas.ts` — 改善版
- `tests/resas.test.ts`

## 追加すべきエンドポイント

```
# 現在未実装 → 追加
GET /population/sum/perYear         総人口推移
GET /population/sum/estimate        将来推計人口
GET /industry/power/forManufacture  製造業特化係数
GET /industry/power/forIndustry     産業花火図データ
GET /tourism/foreigners/forTo       外国人観光（行先別）
GET /municipality/taxes/perYear     地方税推移
GET /municipality/job/perYear       有効求人倍率
GET /municipality/municipality/properties  自治体属性情報
```

## レスポンス型定義（追加必須）

```typescript
interface ResasBaseResponse<T> {
  message: string | null;   // null = 正常
  result: T;
}

interface PopulationData {
  boundaryYear: number;
  data: Array<{
    label: string;
    data: Array<{ year: number; value: number }>;
  }>;
}
```

## 検証基準
- [ ] 全エンドポイントのレスポンス型定義
- [ ] prefCode: 1-47 のバリデーション
- [ ] cityCode: "-" で都道府県全体指定が動作
- [ ] APIキー未設定時のエラーメッセージ
- [ ] テスト全パス
