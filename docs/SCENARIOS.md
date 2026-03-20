# シナリオ複合ツール完全ガイド

japan-gov-mcp の **シナリオ複合ツール** は、複数の政府APIを組み合わせて、政策分析の定型パターンを1コールで実行できる高レベルツールです。

## 全9シナリオ一覧

| シナリオ | APIキー | 主な用途 | 統合API数 |
|---------|---------|----------|-----------|
| 地域医療×マクロ経済 | 不要 | 地域の健康指標と経済の複合分析 | 3 |
| 労働市場需給分析 | 一部必要 | 求人と就業者数の比較 | 2 |
| 企業情報統合分析 | 3つ必要 | 企業の基本情報・補助金・開示書類 | 3 |
| 地域防災リスク評価 | **不要** ✅ | 地震・浸水・河川の複合災害リスク | 3 |
| 学術研究トレンド分析 | **不要** ✅ | 複数DBの横断文献検索 | 4-5 |
| 分野別トレンド比較 | **不要** ✅ | 複数テーマの研究動向比較 | 4-5×N |
| 不動産×人口動態分析 | 1つ必要 | 不動産市場と人口の相関分析 | 3 |
| 地域経済総合分析 | 一部必要 | GDP・産業・インフラの多角的評価 | 4 |
| 全国経済サマリー | **不要** ✅ | 全国の主要経済指標一覧 | 1 |

---

## 1. 地域医療×マクロ経済 統合分析

### `scenario_regional_health_economy`

**用途**: 都道府県の健康統計（NDB）、人口動態（統計ダッシュボード）、マクロ経済指標（日本銀行）を一括取得し、地域の医療と経済の関係を分析。

**APIキー**: 不要 ✅

**パラメータ**:
```typescript
{
  prefectureCode: string;  // 都道府県コード2桁（例: "13" = 東京都）
  year?: number;           // 分析年（省略時は最新）
}
```

**統合API**:
1. **NDB OpenData Hub** - BMI・血圧等の検査データ
2. **統計ダッシュボード** - 人口総数・高齢化率
3. **日本銀行時系列統計** - 企業物価指数（CPI）

**レスポンス例**:
```json
{
  "prefecture": { "code": "13", "name": "東京都" },
  "year": 2024,
  "health": {
    "BMI": { "average": 23.5, "distribution": [...] }
  },
  "population": {
    "total": 14000000,
    "elderly_rate": 0.23
  },
  "macro": {
    "CPI": { "data": [...] }
  }
}
```

**ユースケース**:
- 地域医療政策の立案時に経済状況との相関を確認
- 高齢化率と健康指標の関係分析
- 都道府県間の健康・経済指標比較

---

## 2. 労働市場 需給分析

### `scenario_labor_demand_supply`

**用途**: ハローワーク求人データとe-Stat労働統計を統合し、地域の労働需給バランスを評価。

**APIキー**: 一部必要（HELLOWORK_API_KEY, ESTAT_APP_ID）

**パラメータ**:
```typescript
{
  prefectureCode: string;  // 都道府県コード2桁
  occupation?: string;     // 職種キーワード（例: "看護師", "エンジニア"）
  appId?: string;          // e-Stat AppID（任意）
}
```

**統合API**:
1. **ハローワーク求人webAPI** - 求人件数・職種別求人
2. **e-Stat** - 労働力調査（就業者数・有効求人倍率）

**ユースケース**:
- 特定職種の需給ギャップ分析
- 地域の雇用政策立案
- 人材不足分野の特定

---

## 3. 企業情報 統合分析

### `scenario_corporate_intelligence`

**用途**: 企業名または法人番号から、基本情報・補助金受給履歴・有価証券報告書を一括取得。

**APIキー**: 3つ必要（HOUJIN_APP_ID, GBIZ_TOKEN, EDINET_API_KEY）

**パラメータ**:
```typescript
{
  companyName?: string;      // 企業名（部分一致検索）
  corporateNumber?: string;  // 法人番号13桁（完全一致）
  houjinAppId?: string;      // 法人番号APIキー
  gbizToken?: string;        // gBizINFO APIキー
  edinetApiKey?: string;     // EDINET APIキー
}
```

**統合API**:
1. **法人番号公表サイト** - 法人番号・商号・所在地
2. **gBizINFO** - 補助金受給履歴・特許・調達情報
3. **EDINET** - 有価証券報告書・四半期報告書

**レスポンス例**:
```json
{
  "corporateNumber": "1234567890123",
  "searchedName": "トヨタ自動車",
  "houjin": { "available": true },
  "gbiz": {
    "subsidies": [...],
    "patents": [...]
  },
  "edinet": {
    "documents": [...]
  }
}
```

**ユースケース**:
- M&A・投資調査時の企業デューデリジェンス
- 競合企業の補助金受給状況調査
- 上場企業の開示情報一括取得

---

## 4. 地域防災リスク 評価

### `scenario_disaster_risk_assessment`

**用途**: 住所または座標から、地震ハザード・浸水深・河川水位を統合評価。

**APIキー**: 不要 ✅

**パラメータ**:
```typescript
{
  address?: string;  // 住所（例: "東京都千代田区霞が関1-1-1"）
  lat?: number;      // 緯度（住所の代わりに座標指定可）
  lon?: number;      // 経度
}
```

**統合API**:
1. **国土地理院ジオコーディング** - 住所→座標変換
2. **J-SHIS 地震ハザードステーション** - 地震ハザード情報
3. **国土交通省 浸水ナビ** - 洪水・浸水リスク

**レスポンス例**:
```json
{
  "location": {
    "address": "東京都千代田区霞が関1-1-1",
    "lat": 35.6895,
    "lon": 139.6917
  },
  "risks": {
    "seismic": { "hazard_level": 0.5 },
    "flood": { "max_depth": 2.5 },
    "river": { "error": "stationId required" }
  },
  "summary": "✅ 2/3 の災害リスク情報を取得: 地震ハザード情報取得成功, 浸水リスク情報取得成功"
}
```

**ユースケース**:
- 不動産購入・賃貸前のリスク評価
- 企業の事業継続計画（BCP）策定
- 自治体の防災計画立案

---

## 5. 学術研究 トレンド分析

### `scenario_academic_trend`

**用途**: 複数の学術データベースを横断検索し、特定テーマの研究動向を分析。

**APIキー**: 不要 ✅

**パラメータ**:
```typescript
{
  keyword: string;     // 検索キーワード（例: "AI", "環境問題"）
  limit?: number;      // 各データベースからの取得件数（デフォルト: 5）
  includeAgri?: boolean; // 農業系データベース(AgriKnowledge)も含めるか
}
```

**統合API**:
1. **国立国会図書館サーチ (NDL)** - 書誌情報
2. **J-STAGE** - 学術論文
3. **CiNii Research** - 大学紀要・論文
4. **ジャパンサーチ** - 文化財・デジタルアーカイブ
5. **AgriKnowledge** - 農業研究文献（オプション）

**レスポンス例**:
```json
{
  "keyword": "AI",
  "databases": 4,
  "results": {
    "NDL": {
      "status": "success",
      "count": 5,
      "totalAvailable": 1234,
      "data": [...]
    },
    "J-STAGE": { "status": "success", "count": 5, ... },
    "CiNii": { "status": "success", "count": 5, ... },
    "JapanSearch": { "status": "success", "count": 5, ... }
  },
  "summary": {
    "total": 20,
    "success": 4,
    "failed": 0
  }
}
```

**ユースケース**:
- 新規研究テーマの先行研究調査
- 学際的研究の文献収集
- 政策立案時のエビデンス収集

---

## 6. 分野別トレンド 比較

### `scenario_academic_trend_by_topics`

**用途**: 複数のキーワードで並列検索し、分野ごとの文献数を比較。

**APIキー**: 不要 ✅

**パラメータ**:
```typescript
{
  topics: string[];    // 分野キーワードリスト（例: ["AI", "機械学習", "深層学習"]）
  limit?: number;      // 各トピック・各DBからの取得件数（デフォルト: 3）
}
```

**統合API**: scenario_academic_trend と同じ（4-5データベース × トピック数）

**ユースケース**:
- 複数技術分野の研究動向比較
- 学術トレンドの時系列変化分析
- 研究投資配分の意思決定

---

## 7. 不動産×人口動態 分析

### `scenario_realestate_demographics`

**用途**: 不動産取引価格・地価公示と人口統計を統合し、地域の不動産市場を分析。

**APIキー**: 一部必要（REALESTATE_API_KEY）

**パラメータ**:
```typescript
{
  prefecture?: string;    // 都道府県コード2桁（例: "13" = 東京都）
  city?: string;          // 市区町村コード5桁（例: "13101" = 千代田区）
  year?: number;          // 分析年（デフォルト: 昨年）
  quarter?: number;       // 四半期（1-4, デフォルト: 1）
  realestateApiKey?: string;
}
```

**統合API**:
1. **不動産情報ライブラリ** - 不動産取引価格
2. **不動産情報ライブラリ** - 地価公示・地価調査
3. **統計ダッシュボード** - 人口総数

**ユースケース**:
- 不動産投資判断
- 地価と人口動態の相関分析
- 地域開発計画の策定

---

## 8. 地域経済 総合分析

### `scenario_regional_economy_full`

**用途**: 都道府県のGDP・マクロ指標・産業統計・インフラデータを統合して多角的に評価。

**APIキー**: 一部必要（ESTAT_APP_ID, MLIT_DPF_API_KEY）

**パラメータ**:
```typescript
{
  prefectureCode: string;  // 都道府県コード2桁（必須）
  year?: number;           // 分析年（省略時は最新）
  estatAppId?: string;     // e-Stat AppID（産業統計取得用）
  mlitDpfApiKey?: string;  // 国交省DPF APIキー（インフラデータ用）
}
```

**統合API**:
1. **統計ダッシュボード** - 県内総生産（GDP）
2. **日本銀行** - 企業物価指数
3. **e-Stat** - 経済センサス（産業別事業所数）
4. **国交省データプラットフォーム** - インフラデータ

**ユースケース**:
- 地域経済の包括的評価
- 都道府県間の経済比較
- 地域振興政策の効果測定

---

## 9. 全国経済 サマリー

### `scenario_national_economy_summary`

**用途**: 統計ダッシュボードから全国の主要経済指標を一括取得。

**APIキー**: 不要 ✅

**パラメータ**: なし

**統合API**:
1. **統計ダッシュボード** - 主要経済指標一覧

**ユースケース**:
- 日本全体の経済概況把握
- 47都道府県の経済指標比較準備
- マクロ経済分析の基礎データ取得

---

## APIキー要否マトリクス

| シナリオ | APIキー不要 | 必要なAPIキー |
|---------|------------|--------------|
| 地域医療×マクロ経済 | ✅ | - |
| 労働市場需給分析 | 部分的 | HELLOWORK_API_KEY, ESTAT_APP_ID |
| 企業情報統合分析 | ❌ | HOUJIN_APP_ID, GBIZ_TOKEN, EDINET_API_KEY |
| **地域防災リスク評価** | **✅** | **-** |
| **学術研究トレンド分析** | **✅** | **-** |
| **分野別トレンド比較** | **✅** | **-** |
| 不動産×人口動態分析 | 部分的 | REALESTATE_API_KEY |
| 地域経済総合分析 | 部分的 | ESTAT_APP_ID, MLIT_DPF_API_KEY |
| **全国経済サマリー** | **✅** | **-** |

---

## 実装パターン

全てのシナリオツールは以下の共通パターンで実装されています：

1. **パラメータバリデーション** - 必須パラメータのチェック
2. **並列API呼び出し** - `Promise.allSettled` で複数APIを同時実行
3. **Graceful Degradation** - 一部APIが失敗しても他のデータは返却
4. **統一レスポンス形式** - `ApiResponse<T>` 型で成功/失敗を明示

```typescript
// 実装例（概要）
export async function scenarioExample(params) {
  // 1. バリデーション
  if (!params.required) {
    return createError(source, 'required parameter is missing');
  }

  // 2. 並列API呼び出し
  const [result1, result2, result3] = await Promise.allSettled([
    api1.fetch(params),
    api2.fetch(params),
    api3.fetch(params),
  ]);

  // 3. 結果統合（失敗も含めて）
  const aggregated = {
    data1: result1.status === 'fulfilled' ? result1.value.data : { error: ... },
    data2: result2.status === 'fulfilled' ? result2.value.data : { error: ... },
    data3: result3.status === 'fulfilled' ? result3.value.data : { error: ... },
  };

  // 4. 統一レスポンス
  return {
    success: true,
    data: aggregated,
    source,
    timestamp: new Date().toISOString(),
  };
}
```

---

## 活用事例

### 例1: 自治体の総合政策立案
```
1. scenario_regional_economy_full で経済全体を把握
2. scenario_regional_health_economy で医療・健康状況を確認
3. scenario_disaster_risk_assessment で防災リスクを評価
→ 地域の強み・弱みを多角的に分析し、優先施策を決定
```

### 例2: 企業のM&A調査
```
1. scenario_corporate_intelligence で対象企業の基本情報・補助金・開示書類を取得
2. scenario_realestate_demographics で本社所在地の不動産市場を確認
3. scenario_labor_demand_supply で人材確保の難易度を評価
→ 投資判断に必要な情報を効率的に収集
```

### 例3: 学術研究の先行調査
```
1. scenario_academic_trend で主要キーワードの文献を横断検索
2. scenario_academic_trend_by_topics で関連分野の研究動向を比較
→ 研究の新規性を確認し、先行研究を体系的に整理
```

---

## パフォーマンス最適化

### キャッシュ戦略
- **LONG (24時間)**: マスタデータ（行政区域コード、凡例等）
- **MEDIUM (1時間)**: 統計データ、地価公示
- **SHORT (5分)**: リアルタイムデータ、気象情報
- **なし**: ヘルスチェック

シナリオツールは内部で各APIのキャッシュ設定を引き継ぎます。

### レートリミット
- **Token Bucket方式**: 各APIごとに独立したレート制限
- **自動リトライ**: 429エラー時は指数バックオフで再試行

---

## トラブルシューティング

### Q: シナリオツールで一部データが `{ error: ... }` になる
**A**: 該当APIのキーが未設定か、APIが一時的にダウンしています。`skipped: true` の場合はAPIキー未設定、`error` の場合はAPI呼び出しエラーです。

### Q: 地域防災リスク評価で住所が見つからない
**A**: 国土地理院ジオコーディングは一部の新しい住所や曖昧な表記に対応していません。座標（lat, lon）を直接指定してください。

### Q: 企業情報統合分析で法人番号が取得できない
**A**: 企業名の表記揺れ（株式会社の有無、英字表記等）が原因です。法人番号を直接指定するか、`houjin_search` で事前に正確な法人名を確認してください。

---

## 次のステップ

- **カスタムシナリオの作成**: `src/scenarios/` に独自のシナリオツールを追加可能
- **パラメータの拡張**: 既存シナリオに新しいフィルタや集計ロジックを追加
- **新規API統合**: 新しい政府APIを追加してシナリオの幅を拡大

詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) と各providerのソースコードを参照してください。
