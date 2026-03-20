# japan-gov-mcp

日本の中央省庁が提供する主要APIを統合した [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) サーバー。
Claude Desktop / Claude Code から日本政府のオープンデータに直接アクセスできます。

## 特徴

- **23 API / 80 ツール** を1つのMCPサーバーで統合
- **シナリオ複合ツール 9個** - 複数APIを組み合わせた政策分析パターンを1コールで実行
- **APIキー不要のツール 約50個** - インストール直後から利用可能
- **横断検索** (`gov_cross_search`) で複数APIを一括検索
- **LLM最適化レスポンス** と **インメモリキャッシュ + レートリミット** を内蔵

## シナリオ複合ツール（9個）

単一APIの組み合わせで、政策分析の定型パターンを実行：

| シナリオ | APIキー | 用途 |
|---------|---------|------|
| **地域防災リスク評価** | **不要** ✅ | 住所から地震・浸水・河川リスクを一括評価 |
| **学術研究トレンド分析** | **不要** ✅ | NDL+J-STAGE+CiNii+ジャパンサーチを横断検索 |
| **全国経済サマリー** | **不要** ✅ | 全国の主要経済指標を一覧取得 |
| 地域医療×マクロ経済 | 不要 | NDB健診+人口+日銀マクロ指標 |
| 労働市場需給分析 | 一部必要 | ハローワーク求人+e-Stat労働統計 |
| 企業情報統合分析 | 3つ必要 | 法人番号+gBizINFO+EDINET開示書類 |
| 分野別トレンド比較 | 不要 | 複数テーマの研究動向を並列比較 |
| 不動産×人口動態分析 | 1つ必要 | 不動産取引+地価+人口統計 |
| 地域経済総合分析 | 一部必要 | GDP+産業統計+インフラデータ |

詳細は [docs/SCENARIOS.md](./docs/SCENARIOS.md) を参照。

## 対応API（23種）

### 統計・経済データ

| API | 省庁 | APIキー | ツール数 | 主なデータ |
|-----|------|---------|---------|-----------|
| **e-Stat** | 総務省 | 要 | 3 | 国勢調査, GDP, CPI, 家計調査等 |
| **統計ダッシュボード** | 総務省 | 不要 | 2 | 約6,000系列の統計指標 |
| **NDB OpenData Hub** | 厚労省 | 不要 | 5 | 特定健診データ（BMI, 血圧等） |
| **日本銀行時系列統計** | 日本銀行 | 不要 | 2 | マネーストック, CPI, 為替レート |

### 企業・法人データ

| API | 省庁 | APIキー | ツール数 | 主なデータ |
|-----|------|---------|---------|-----------|
| **法人番号** | 国税庁 | 要 | 1 | 法人番号, 商号, 所在地 |
| **gBizINFO** | 経産省 | 要 | 2 | 補助金, 特許, 調達, 財務, 認定 |
| **EDINET** | 金融庁 | 要 | 1 | 有価証券報告書, 四半期報告書 |

### 法令・地理・防災

| API | 省庁 | APIキー | ツール数 | 主なデータ |
|-----|------|---------|---------|-----------|
| **法令API V2** | デジタル庁/e-Gov | 不要 | 3 | 法令一覧, 法令本文, キーワード検索 |
| **気象庁防災情報** | 気象庁 | 不要 | 4 | 天気予報, 台風, AMeDAS観測 |
| **J-SHIS 地震ハザード** | 防災科研 | 不要 | 1 | 地震ハザードステーション |
| **国土地理院** | 国土交通省 | 不要 | 2 | ジオコーディング, 逆ジオコーディング |
| **Geoshape (NII)** | 国立情報学研究所 | 不要 | 2 | 市区町村・都道府県境界GeoJSON |
| **浸水ナビ・河川水位** | 国土交通省 | 不要 | 2 | 洪水リスク, リアルタイム水位 |

### 学術・文化データ

| API | 省庁 | APIキー | ツール数 | 主なデータ |
|-----|------|---------|---------|-----------|
| **国立国会図書館サーチ** | 国立国会図書館 | 不要 | 1 | 書誌情報検索 |
| **J-STAGE** | 科学技術振興機構 | 不要 | 1 | 学術論文検索 |
| **CiNii Research** | 国立情報学研究所 | 不要 | 1 | 学術論文・大学紀要 |
| **ジャパンサーチ** | デジタル庁 | 不要 | 1 | 文化財・美術作品横断検索 |
| **AgriKnowledge** | 農研機構 | 不要 | 1 | 農業研究文献 |

### その他

- **不動産情報ライブラリ** (国交省) - 取引価格・地価公示
- **国交省データプラットフォーム** (国交省) - 公共事業・交通統計
- **データカタログ** (デジタル庁) - data.go.jp 横断検索
- **G空間情報センター** (国交省) - GIS データセット
- **国会会議録検索** (国会図書館) - 発言・会議検索
- **官公需情報ポータル** (中小企業庁) - 調達情報
- **そらまめくん** (環境省) - 大気汚染データ
- **シームレス地質図** (産総研) - 地質情報
- **JAXA G-Portal** (JAXA) - 衛星データ
- **海外安全情報** (外務省) - 渡航危険度
- **求人webAPI** (厚労省) - ハローワーク求人

**プレースホルダ**: 海しる (MSIL), ODPT 公共交通

**統合ツール**: `gov_api_catalog`, `gov_cross_search`

## 利用シナリオ例

### 1. 特定地点の災害リスク評価（APIキー不要）
```typescript
scenario_disaster_risk_assessment({
  address: "東京都千代田区霞が関1-1-1"
})
→ 地震ハザード + 浸水深 + 河川水位を自動取得
```

### 2. AI研究の学術トレンド分析（APIキー不要）
```typescript
scenario_academic_trend({
  keyword: "AI",
  includeAgri: false
})
→ NDL, J-STAGE, CiNii, ジャパンサーチから文献を横断検索
```

### 3. 企業の総合情報調査（APIキー必要）
```typescript
scenario_corporate_intelligence({
  companyName: "トヨタ自動車",
  houjinAppId: "your-key",
  gbizToken: "your-key",
  edinetApiKey: "your-key"
})
→ 法人情報 + 補助金履歴 + 有価証券報告書を一括取得
```

### 4. 地域医療と経済の複合分析（APIキー不要）
```typescript
scenario_regional_health_economy({
  prefectureCode: "13",  // 東京都
  year: 2024
})
→ NDB健診データ + 人口統計 + 日銀マクロ指標を統合
```

### 5. 複数分野の研究動向比較（APIキー不要）
```typescript
scenario_academic_trend_by_topics({
  topics: ["AI", "機械学習", "深層学習"],
  limit: 3
})
→ 各分野の文献数を並列取得して比較
```

## クイックスタート

### インストール

```bash
git clone https://github.com/reikumaki/japan-gov-mcp.git
cd japan-gov-mcp
npm install
npm run build
npm test
```

### APIキー不要で利用可能なツール（約50個）

以下のツールはAPIキー設定なしで即座に利用できます：

**統計・経済**: `dashboard_indicators`, `dashboard_data`, `boj_timeseries`, `boj_major_statistics`

**健康**: `ndb_inspection_stats`, `ndb_items`, `ndb_areas`, `ndb_range_labels`, `ndb_hub_proxy`

**法令**: `law_search`, `law_data`, `law_keyword_search`

**気象・防災**: `jma_forecast`, `jma_overview`, `jma_forecast_week`, `jma_typhoon`, `jshis_hazard`, `amedas_stations`, `amedas_data`, `flood_depth`, `river_level`

**地理**: `gsi_geocode`, `gsi_reverse_geocode`, `geoshape_city`, `geoshape_pref`, `traffic_volume`

**学術**: `ndl_search`, `jstage_search`, `cinii_search`, `japansearch_search`, `agriknowledge_search`

**科学**: `soramame_air`, `geology_legend`, `geology_at_point`, `jaxa_collections`

**政府**: `safety_overseas`, `kokkai_speeches`, `kokkai_meetings`, `kkj_search`

**カタログ**: `opendata_search`, `opendata_detail`, `geospatial_search`, `geospatial_dataset`, `geospatial_organizations`

**シナリオ**: `scenario_disaster_risk_assessment`, `scenario_academic_trend`, `scenario_academic_trend_by_topics`, `scenario_national_economy_summary`, `scenario_regional_health_economy`

### Claude Desktop での設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "japan-gov-mcp": {
      "command": "node",
      "args": ["/path/to/japan-gov-mcp/build/index.js"],
      "env": {
        "ESTAT_APP_ID": "your-estat-app-id",
        "GBIZ_TOKEN": "your-gbiz-token"
      }
    }
  }
}
```

## APIキー取得先

任意で追加できるAPIキー（より詳細なデータアクセス用）：

| API | 環境変数 | 登録URL | 無料枠 |
|-----|---------|---------|-------|
| e-Stat | `ESTAT_APP_ID` | https://www.e-stat.go.jp/api/ | ✅ 無料 |
| 法人番号 | `HOUJIN_APP_ID` | https://www.houjin-bangou.nta.go.jp/webapi/ | ✅ 無料 |
| gBizINFO | `GBIZ_TOKEN` | https://info.gbiz.go.jp/hojin/api | ✅ 無料 |
| EDINET | `EDINET_API_KEY` | https://disclosure2.edinet-fsa.go.jp/ | ✅ 無料 |
| ハローワーク | `HELLOWORK_API_KEY` | https://www.hellowork.mhlw.go.jp/ | ✅ 無料 |
| 不動産情報 | `REALESTATE_API_KEY` | https://www.reinfolib.mlit.go.jp/ | ✅ 無料 |
| 国交省DPF | `MLIT_DPF_API_KEY` | https://www.mlit-data.jp/ | ✅ 無料 |
| 海しる | `MSIL_API_KEY` | https://www.msil.go.jp/ | ✅ 無料 |
| ODPT | `ODPT_API_KEY` | https://developer.odpt.org/ | ✅ 無料 |

**注**: RESAS API は 2025-03-24 に提供終了しました。代替として e-Stat / 統計ダッシュボード / 国交省データプラットフォームをご利用ください。

## ツールカテゴリ一覧

### `gov_api_catalog` で確認可能

全80ツールは以下の11カテゴリに分類されています：

- **statistics** (5) - 政府統計総合窓口・ダッシュボード
- **economy** (9) - 企業情報・金融・不動産
- **law** (3) - 法令データベース
- **geospatial** (10) - 地理情報・境界データ・交通
- **disaster** (9) - 気象・防災・河川
- **labor** (1) - 求人情報
- **academic** (5) - 学術文献・図書
- **science** (4) - 環境・地質・衛星
- **health** (5) - 医療統計・健診データ
- **government** (4) - 国会・調達・海外安全
- **catalog** (11) - メタカタログ・横断検索・シナリオ

## 開発

```bash
npm run build       # TypeScript コンパイル
npm run typecheck   # 型チェックのみ
npm test            # 全テスト実行（233テスト）
npm run inspect     # MCP Inspector でGUIテスト
```

## ドキュメント

- [シナリオ複合ツール完全ガイド](./docs/SCENARIOS.md) - 全9シナリオの詳細説明
- [対話プロンプトガイド](./docs/PROMPTS.md) - LLMエージェント向けプロンプトテンプレート
- [監査・再現性ガイド](./docs/AUDIT.md) - 研究・政策分析での監査ログ活用
- [アーキテクチャ設計](./docs/ARCHITECTURE.md) - システム設計と拡張方法
- [APIカタログ](./docs/API_CATALOG.md) - 全API仕様一覧
- [タスク管理](./docs/TASK_PLAN.md) - 実装進捗

## ライセンス

MIT

## 貢献

Pull Request 歓迎です。Issue での機能提案・バグ報告もお待ちしています。

## 関連リンク

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)
- [政府統計の総合窓口 (e-Stat)](https://www.e-stat.go.jp/)
- [データカタログサイト (data.go.jp)](https://www.data.go.jp/)
