# 対話プロンプトガイド

このガイドでは、japan-gov-mcpの各ツールを自然言語で呼び出すための**プロンプトテンプレート**を提供します。LLMエージェント（Claude、GPT等）がこれらのツールを効率的に使用するための推奨パターンを示します。

## 目次

- [シナリオ複合ツール（9個）](#シナリオ複合ツール9個)
- [単体ツールプロンプト例](#単体ツールプロンプト例)
- [LLMエージェント向けガイドライン](#llmエージェント向けガイドライン)
- [制約事項・注意](#制約事項注意)

---

## シナリオ複合ツール（9個）

### 1. scenario_disaster_risk_assessment — 地域防災リスク評価

**推奨ツール呼び出しシーケンス**: `scenario_disaster_risk_assessment` → （詳細が必要なら）`flood_depth`, `river_level`

#### プロンプト例 1: 住所指定
```
東京都千代田区霞が関1-1-1の地震・浸水・河川リスクを評価してください
```
→ `scenario_disaster_risk_assessment({ address: "東京都千代田区霞が関1-1-1" })`

#### プロンプト例 2: 座標指定
```
緯度35.6895、経度139.6917地点の災害リスクを調べてください
```
→ `scenario_disaster_risk_assessment({ lat: 35.6895, lon: 139.6917 })`

#### プロンプト例 3: 詳細分析
```
大阪市役所の防災リスクを評価し、浸水深の詳細データも追加で取得してください
```
→ `scenario_disaster_risk_assessment({ address: "大阪市北区中之島1-3-20" })` → （結果の座標を使って）`flood_depth({ lat: ..., lon: ... })`

#### 注意事項

- このシナリオでは**個人単位の情報は扱わず**、統計・リスク指標のみを利用します。
- **RESAS系ツールは廃止済み**のため利用しません（代替: `estat_search`, `dashboard_data`, `mlit_dpf_search`）。

---

### 2. scenario_academic_trend — 学術研究トレンド分析

**推奨ツール呼び出しシーケンス**: `scenario_academic_trend` → （特定DB詳細なら）`ndl_search`, `jstage_search`, `cinii_search`

#### プロンプト例 1: 基本検索
```
「AI」に関する学術文献のトレンドを、NDL・J-STAGE・CiNii・ジャパンサーチから横断検索してください
```
→ `scenario_academic_trend({ keyword: "AI", limit: 10 })`

#### プロンプト例 2: 農業系含む
```
「稲作」の研究動向を、農業系DB（AgriKnowledge）も含めて調査してください
```
→ `scenario_academic_trend({ keyword: "稲作", includeAgri: true, limit: 5 })`

#### プロンプト例 3: 詳細分析
```
「量子コンピュータ」の文献を検索し、J-STAGEでの論文数が多いか確認してください
```
→ `scenario_academic_trend({ keyword: "量子コンピュータ" })` → `jstage_search({ query: "量子コンピュータ", count: 20 })`

#### 注意事項

- 論文・資料は**必ず元サイト**（J-STAGE, CiNii, NDL等）を確認し、要約時に誤読に注意してください。
- 検索結果の件数は**あくまで参考値**です（データベースの更新頻度により変動）。

---

### 3. scenario_academic_trend_by_topics — 分野別トレンド比較

**推奨ツール呼び出しシーケンス**: `scenario_academic_trend_by_topics` 単独で完結

#### プロンプト例 1: 複数キーワード比較
```
「AI」「機械学習」「深層学習」の3分野で、どれが最も文献数が多いか比較してください
```
→ `scenario_academic_trend_by_topics({ topics: ["AI", "機械学習", "深層学習"], limit: 5 })`

#### プロンプト例 2: 分野横断比較
```
「気候変動」「脱炭素」「再生可能エネルギー」の研究トレンドを並列比較してください
```
→ `scenario_academic_trend_by_topics({ topics: ["気候変動", "脱炭素", "再生可能エネルギー"] })`

#### プロンプト例 3: 件数限定
```
「COVID-19」「ワクチン」「パンデミック」の文献を各3件ずつ取得して比較してください
```
→ `scenario_academic_trend_by_topics({ topics: ["COVID-19", "ワクチン", "パンデミック"], limit: 3 })`

#### 注意事項

- 論文・資料は**必ず元サイト**（J-STAGE, CiNii, NDL等）を確認し、要約時に誤読に注意してください。
- 各トピックの件数比較は**データベース間で基準が異なる**ため、絶対値での比較は避けてください。

---

### 4. scenario_national_economy_summary — 全国経済サマリー

**推奨ツール呼び出しシーケンス**: `scenario_national_economy_summary` → （詳細なら）`dashboard_data`, `boj_timeseries`

#### プロンプト例 1: 全国経済概況
```
日本全国の主要経済指標（人口・失業率・CPI等）をサマリーで取得してください
```
→ `scenario_national_economy_summary({})`

#### プロンプト例 2: 詳細分析
```
全国経済サマリーを取得し、失業率の詳細時系列データも追加で確認してください
```
→ `scenario_national_economy_summary({})` → `dashboard_data({ indicatorCode: "A1502" })`

#### プロンプト例 3: マクロ指標追加
```
全国の経済サマリーを取得し、日銀のマネーストックM2の最新データも確認してください
```
→ `scenario_national_economy_summary({})` → `boj_timeseries({ seriesCode: "CPLAAQ" })`

#### 注意事項

- **RESAS系ツールは廃止済み**のため利用しません（代替: `estat_search`, `dashboard_data`, `boj_timeseries`）。
- 経済指標は**取得時点のスナップショット**であり、最新値は日々更新される可能性があります。

---

### 5. scenario_regional_health_economy — 地域医療×マクロ経済分析

**推奨ツール呼び出しシーケンス**: `scenario_regional_health_economy` → （詳細なら）`ndb_inspection_stats`, `boj_timeseries`

#### プロンプト例 1: 東京都の分析
```
東京都の健診データ（BMI, 血圧等）と経済指標を統合分析してください
```
→ `scenario_regional_health_economy({ prefectureCode: "13", year: 2024 })`

#### プロンプト例 2: 特定年度指定
```
2023年の大阪府の医療統計と経済動向を分析してください
```
→ `scenario_regional_health_economy({ prefectureCode: "27", year: 2023 })`

#### プロンプト例 3: 詳細分析
```
北海道の健診データを取得し、HbA1cの詳細分布も確認してください
```
→ `scenario_regional_health_economy({ prefectureCode: "01" })` → `ndb_inspection_stats({ itemName: "HbA1c", prefectureName: "北海道" })`

#### 注意事項

- **NDB関連はオープンデータや集計値のみ**を扱い、個票レベルの推論は絶対に禁止です。
- 医療指標を用いた地域比較は、**年齢構成や人口規模の違いに留意**する必要があります。
- **RESAS系ツールは廃止済み**のため利用しません（代替: `estat_search`, `dashboard_data`）。

---

### 6. scenario_labor_demand_supply — 労働市場需給分析

**推奨ツール呼び出しシーケンス**: `scenario_labor_demand_supply` → （詳細なら）`search_jobs`, `estat_search`

#### プロンプト例 1: 東京都の労働市場
```
東京都の労働市場需給バランスを、求人データと労働統計から分析してください
```
→ `scenario_labor_demand_supply({ prefecture: "東京都" })`

#### プロンプト例 2: 特定職種
```
愛知県のIT関連求人と労働統計を統合分析してください
```
→ `scenario_labor_demand_supply({ prefecture: "愛知県", occupation: "IT" })`

#### プロンプト例 3: 詳細検索
```
大阪府の看護師求人の詳細と、医療従事者の統計データを確認してください
```
→ `scenario_labor_demand_supply({ prefecture: "大阪府", occupation: "看護師" })` → `search_jobs({ region: "27" })`

#### 注意事項

- 求人情報は**日々変動する**ため、「ある時点のスナップショット」として扱ってください。
- **RESAS系ツールは廃止済み**のため利用しません（代替: `estat_search`, `search_jobs`）。

---

### 7. scenario_corporate_intelligence — 企業情報統合分析

**推奨ツール呼び出しシーケンス**: `scenario_corporate_intelligence` → （詳細なら）`gbiz_subsidy`, `edinet_list`

#### プロンプト例 1: 企業名検索
```
トヨタ自動車の法人情報・補助金履歴・有価証券報告書を統合取得してください
```
→ `scenario_corporate_intelligence({ companyName: "トヨタ自動車", houjinAppId: "...", gbizToken: "...", edinetApiKey: "..." })`

#### プロンプト例 2: 法人番号指定
```
法人番号1234567890123の企業情報を、gBizINFOとEDINETから取得してください
```
→ `scenario_corporate_intelligence({ corporateNumber: "1234567890123", gbizToken: "...", edinetApiKey: "..." })`

#### プロンプト例 3: APIキー未設定時
```
ソニーグループの情報を取得してください（APIキーは未設定）
```
→ `scenario_corporate_intelligence({ companyName: "ソニーグループ" })` ※ skipped情報が返る

#### 注意事項

- **複数のAPIキーが必要**です（法人番号、gBizINFO、EDINET）。未設定のAPIはskippedとして報告されます。
- 法人情報・補助金・開示書類は**公開情報のみ**を扱い、非公開情報の推測は行いません。

---

### 8. scenario_realestate_demographics — 不動産×人口動態分析

**推奨ツール呼び出しシーケンス**: `scenario_realestate_demographics` → （詳細なら）`realestate_transactions`, `dashboard_data`

#### プロンプト例 1: 都道府県別分析
```
東京都の不動産取引・地価・人口統計を統合分析してください
```
→ `scenario_realestate_demographics({ prefecture: "13", year: 2023, quarter: 1 })`

#### プロンプト例 2: 市区町村指定
```
2023年第2四半期の千代田区の不動産市場と人口動態を分析してください
```
→ `scenario_realestate_demographics({ city: "13101", year: 2023, quarter: 2 })`

#### プロンプト例 3: APIキー未設定時
```
大阪府の不動産と人口を分析してください（不動産APIキー未設定）
```
→ `scenario_realestate_demographics({ prefecture: "27" })` ※ 不動産データは skipped

#### 注意事項

- 不動産取引価格・地価公示は**公開情報のみ**を扱い、個別取引の詳細は含まれません。
- **RESAS系ツールは廃止済み**のため利用しません（代替: `estat_search`, `dashboard_data`）。
- 不動産APIキー未設定時は、不動産データがskippedとして報告されます。

---

### 9. scenario_regional_economy_full — 地域経済総合分析

**推奨ツール呼び出しシーケンス**: `scenario_regional_economy_full` → （詳細なら）`dashboard_data`, `mlit_dpf_search`

#### プロンプト例 1: 都道府県経済分析
```
東京都の経済を、GDP・産業統計・インフラデータから総合分析してください
```
→ `scenario_regional_economy_full({ prefectureCode: "13", year: 2024 })`

#### プロンプト例 2: 特定年度
```
2023年の愛知県の経済状況を総合的に分析してください
```
→ `scenario_regional_economy_full({ prefectureCode: "23", year: 2023 })`

#### プロンプト例 3: 詳細分析
```
福岡県の経済分析を実施し、国交省データプラットフォームから交通統計も追加確認してください
```
→ `scenario_regional_economy_full({ prefectureCode: "40" })` → `mlit_dpf_search({ apiKey: "...", keyword: "福岡 交通" })`

#### 注意事項

- **RESAS系ツールは廃止済み**のため利用しません（代替: `estat_search`, `dashboard_data`, `mlit_dpf_search`）。
- 経済指標は**取得時点のスナップショット**であり、最新値は日々更新される可能性があります。
- 複数のAPIを並列実行するため、一部APIがエラーでも他のデータは取得できます（部分的成功）。

---

## 単体ツールプロンプト例

### 統計・経済

#### estat_search — e-Stat統計表検索
```
「国勢調査」で統計表を検索してください
```
→ `estat_search({ surveyName: "国勢調査" })`

#### dashboard_data — 統計ダッシュボードデータ取得
```
東京都の人口推移データ（指標A1101）を取得してください
```
→ `dashboard_data({ indicatorCode: "A1101", regionCode: "13000" })`

#### boj_timeseries — 日銀時系列統計
```
2020年から2024年のマネーストックM2データを取得してください
```
→ `boj_timeseries({ seriesCode: "CPLAAQ", fromYear: 2020, toYear: 2024 })`

### 法令

#### law_search — 法令検索
```
「個人情報」に関連する法令を検索してください
```
→ `law_search({ keyword: "個人情報" })`

#### law_data — 法令本文取得
```
法令番号320AC0000000057の全文を取得してください
```
→ `law_data({ lawNum: "320AC0000000057" })`

### 地理・防災

#### gsi_geocode — 国土地理院ジオコーディング
```
「東京都千代田区霞が関1-1-1」の緯度経度を取得してください
```
→ `gsi_geocode({ address: "東京都千代田区霞が関1-1-1" })`

#### jma_forecast — 気象庁天気予報
```
東京都の週間天気予報を取得してください
```
→ `jma_forecast({ areaCode: "130000" })`

#### jshis_hazard — J-SHIS地震ハザード
```
緯度35.6895、経度139.6917の地震ハザードマップを取得してください
```
→ `jshis_hazard({ lat: 35.6895, lon: 139.6917 })`

### 学術

#### ndl_search — 国立国会図書館検索
```
「量子コンピュータ」に関する書籍を10件検索してください
```
→ `ndl_search({ query: "量子コンピュータ", count: 10 })`

#### jstage_search — J-STAGE論文検索
```
「AI」の論文を最新20件取得してください
```
→ `jstage_search({ query: "AI", count: 20 })`

### 健康

#### ndb_inspection_stats — NDB健診統計
```
東京都のBMI分布データを取得してください
```
→ `ndb_inspection_stats({ itemName: "BMI", prefectureName: "東京都" })`

### 企業

#### houjin_search — 法人番号検索
```
「トヨタ自動車」の法人番号を検索してください
```
→ `houjin_search({ appId: "...", name: "トヨタ自動車" })`

#### gbiz_subsidy — gBizINFO補助金情報
```
法人番号1234567890123の補助金履歴を取得してください
```
→ `gbiz_subsidy({ token: "...", corporateNumber: "1234567890123" })`

---

## LLMエージェント向けガイドライン

### 1. シナリオツール優先

ユーザーが「○○を分析したい」と言った場合、**まずシナリオ複合ツールが該当しないか確認**してください。

- 「東京都の経済を分析」→ `scenario_regional_economy_full`
- 「企業の情報を調べたい」→ `scenario_corporate_intelligence`
- 「災害リスクを評価」→ `scenario_disaster_risk_assessment`
- 「文献を検索」→ `scenario_academic_trend` または `scenario_academic_trend_by_topics`

### 2. APIキー未設定への対応

シナリオツールは**APIキー未設定でも動作**し、取得できたデータのみ返します。

- APIキーが必要なデータは `skipped` として報告される
- `skipped` 配列をユーザーに提示し、「APIキーを設定すればこれらも取得できます」と案内

### 3. プロンプトの段階的実行

複雑な分析は段階的に実行してください：

1. **まずシナリオツール**で概要把握
2. **詳細が必要なら単体ツール**で深掘り
3. **結果を統合**してユーザーに提示

例:
```
ユーザー: 「東京都の経済と健康を分析したい」

1. scenario_regional_economy_full({ prefectureCode: "13" })
2. scenario_regional_health_economy({ prefectureCode: "13" })
3. 両結果を統合してサマリー作成
```

### 4. エラーハンドリング

- **APIキー未設定エラー**: ユーザーにAPIキー登録URLを案内
- **パラメータエラー**: エラーメッセージから必須パラメータを確認し、ユーザーに質問
- **API障害**: 別のツールで代替できないか検討

### 5. データ量の調整

- デフォルトで大量のデータを取得しない（`limit`, `count` パラメータを活用）
- ユーザーが「詳細」を求めたら `limit` を増やす
- 統計データは期間を限定する（`fromYear`, `toYear`）

---

## 制約事項・注意

### ⚠️ RESAS API 廃止（2025-03-24）

RESAS関連ツール（`resas_*`）は**2025年3月24日に提供終了**しました。

**代替ツール**:
- 人口統計 → `estat_search`, `dashboard_data`
- 産業統計 → `estat_search`, `mlit_dpf_search`
- 観光統計 → `mlit_dpf_search`

### ⚠️ NDB個人データの取り扱い

NDB OpenData Hubは**集計データのみ**提供します。個人を特定できるデータは含まれません。

- `ndb_inspection_stats`: 都道府県・年代別の**集計値**のみ
- `ndb_hub_proxy`: 外部MCPエンドポイント経由（要設定）

### ⚠️ APIキー必須ツール

以下のツールは**APIキー設定が必須**です（未設定時はエラー）:

- `estat_*` — ESTAT_APP_ID
- `houjin_search` — HOUJIN_APP_ID
- `gbiz_*` — GBIZ_TOKEN
- `edinet_*` — EDINET_API_KEY
- `search_jobs` — HELLOWORK_API_KEY
- `realestate_*` — REALESTATE_API_KEY
- `mlit_dpf_*` — MLIT_DPF_API_KEY

### ⚠️ レートリミット

各APIにはレートリミットがあります。大量リクエスト時は：

- エラーメッセージを確認
- リトライ間隔を調整
- バッチ処理を検討

---

## まとめ

このガイドを参考に、japan-gov-mcpの80ツールを効率的に活用してください。

- **シナリオツール（9個）**: 複雑な分析を1コールで実行
- **単体ツール（71個）**: 詳細データ取得・深掘り分析
- **LLMエージェント**: プロンプトを段階的に実行し、エラーに柔軟に対応

**参考資料**:
- [README.md](../README.md) — クイックスタート・API一覧
- [SCENARIOS.md](./SCENARIOS.md) — 全9シナリオの詳細ガイド
- [API_CATALOG.md](./API_CATALOG.md) — 全API仕様
- [AUDIT.md](./AUDIT.md) — 監査ログ・再現性ガイド
