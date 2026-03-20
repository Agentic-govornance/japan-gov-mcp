# ARCHITECTURE.md — japan-gov-mcp アーキテクチャ設計書

## 1. システム全体像

```
                        ┌─────────────────────┐
                        │   Claude Desktop     │
                        │   Claude Code        │
                        │   (MCP Client)       │
                        └──────────┬──────────┘
                                   │ stdio (JSON-RPC)
                                   ▼
                        ┌─────────────────────┐
                        │  japan-gov-mcp       │
                        │  (MCP Server)        │
                        │                      │
                        │  ┌───────────────┐   │
                        │  │ Tool Router    │   │
                        │  │ 28 tools       │   │
                        │  └───────┬───────┘   │
                        │          │            │
                        │  ┌───────▼───────┐   │
                        │  │ Cache Layer    │   │  ← LRU + TTL 実装済み
                        │  │ (in-memory)    │   │
                        │  └───────┬───────┘   │
                        │          │            │
                        │  ┌───────▼───────┐   │
                        │  │ Provider Layer │   │
                        │  │ 12 providers   │   │
                        │  └───────┬───────┘   │
                        │          │            │
                        │  ┌───────▼───────┐   │
                        │  │ HTTP Utility   │   │
                        │  │ fetchJson/Xml  │   │
                        │  └───────┬───────┘   │
                        └──────────┼──────────┘
                                   │ HTTPS
                    ┌──────────────┼──────────────┐
                    ▼              ▼               ▼
            ┌─────────────┐ ┌──────────┐ ┌──────────────┐
            │ e-Stat API  │ │ RESAS    │ │ 法人番号API   │ ...
            │ 総務省       │ │ 内閣府   │ │ 国税庁       │
            └─────────────┘ └──────────┘ └──────────────┘
```

## 2. レイヤー設計

### Layer 1: MCP Server (src/index.ts)
- McpServer + StdioServerTransport
- 全28ツールの登録・ルーティング
- 環境変数からの設定読み込み
- 統合ツール（横断検索 `gov_cross_search`、APIカタログ `gov_api_catalog`）
- `formatResponse` でLLM向けレスポンス整形

### Layer 2: Provider (src/providers/*.ts)
- 1ファイル = 1 API（省庁単位）
- 純粋関数: (config, params) → Promise<ApiResponse<T>>
- 副作用なし、状態なし
- Provider同士は依存しない

### Layer 3: HTTP Utility (src/utils/http.ts)
- fetchJson / fetchXml ラッパー
- タイムアウト、エラーハンドリング
- URL Builder (`buildUrl`)
- 統一レスポンス型 `ApiResponse<T>`
- LRUキャッシュ（TTL付きインメモリ、`CacheTTL` enum で API別設定）
- レートリミット（`TokenBucket` + 429自動リトライ、指数バックオフ）

## 3. データフロー

```
ユーザー: 「東京都の人口推移を教えて」
  ↓
Claude (MCP Client): resas_population(prefCode=13, cityCode="-")
  ↓ JSON-RPC over stdio
MCP Server: Tool Router → resas_population ハンドラ
  ↓
Provider: resas.getPopulation(config, {prefCode: 13, cityCode: "-"})
  ↓
HTTP: GET https://opendata.resas-portal.go.jp/api/v1/population/composition/perYear?prefCode=13&cityCode=-
  ↓ JSON Response
Provider → Tool Handler → MCP Response
  ↓
Claude: データを解釈して自然言語で回答
```

## 4. エラーハンドリング方針

```typescript
// 全てのAPIレスポンスは ApiResponse<T> で統一
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;       // エラー時のメッセージ
  source: string;       // "e-Stat/getStatsList" 等
  timestamp: string;    // ISO 8601
}
```

| エラー種別 | 処理 |
|-----------|------|
| APIキー未設定 | `⚠️ {KEY名}が設定されていません` を返す |
| HTTP 4xx | `success: false` + ステータスコード |
| HTTP 5xx | `success: false` + リトライ提案 |
| タイムアウト | 30秒でAbort → エラー返却 |
| パース失敗 | 生レスポンスをエラーに含める |

**例外は投げない。** 全て `ApiResponse` で返し、MCP ツールハンドラがテキストとして返却。

## 5. 省庁別API仕様サマリー

### Tier 1: 統計基盤

#### e-Stat API (総務省統計局)
- Base: `https://api.e-stat.go.jp/rest/3.0/app/json/`
- Auth: `appId` クエリパラメータ
- 主要エンドポイント:
  - `getStatsList` - 統計表検索
  - `getMetaInfo` - メタ情報
  - `getStatsData` - データ取得（最大100,000件/回）
  - `getDataCatalog` - データセット参照
- Rate Limit: 明示なし（常識的な範囲で）
- レスポンス: JSON (XML/CSV も選択可)

#### RESAS API (内閣府)
- Base: `https://opendata.resas-portal.go.jp/api/v1/`
- Auth: `X-API-KEY` ヘッダー
- 主要カテゴリ: 人口, 産業, 観光, 農業, 特許, 地方財政
- Rate Limit: 明示なし
- レスポンス: JSON

#### 統計ダッシュボード (総務省)
- Base: `https://dashboard.e-stat.go.jp/api/1.0/Json/`
- Auth: 不要
- 約6,000系列、時間軸×地域軸
- レスポンス: JSON/XML/CSV

### Tier 2: 法人・金融

#### 法人番号 Web-API (国税庁)
- Base: `https://api.houjin-bangou.nta.go.jp/4/`
- Auth: `id` クエリパラメータ
- エンドポイント: `num`(番号検索), `name`(名称検索), `diff`(差分取得)
- レスポンス: JSON/CSV/XML

#### gBizINFO REST API (経済産業省)
- Base: `https://info.gbiz.go.jp/hojin/v1/`
- Auth: `X-hojinInfo-api-token` ヘッダー
- 法人番号をキーに横断情報（補助金/特許/調達/財務/表彰/認定/職場）
- レスポンス: JSON

#### EDINET API (金融庁)
- Base: `https://api.edinet-fsa.go.jp/api/v2/`
- Auth: `Subscription-Key` クエリパラメータ
- 日付指定で開示書類一覧、docID指定で個別書類
- レスポンス: JSON (メタデータ), ZIP (書類本体)

### Tier 3: 法令

#### 法令API (e-Gov)
- Base: `https://elaws.e-gov.go.jp/api/1/`
- Auth: 不要
- レスポンス: XML

### Tier 4: セクター別

#### 不動産情報ライブラリ (国土交通省)
- Base: `https://www.reinfolib.mlit.go.jp/ex-api/external/`
- Auth: 不要

#### データカタログ (デジタル庁)
- Base: `https://www.data.go.jp/data/api/3/`
- Auth: 不要 (CKAN API)

#### 海外安全情報 (外務省)
- Base: `https://www.anzen.mofa.go.jp/od/`
- Auth: 不要

#### 求人webAPI (厚生労働省)
- Auth: `X-API-KEY` ヘッダー

#### 文化遺産オンライン (文部科学省)
- Base: `https://bunka.nii.ac.jp/api/`
- Auth: 不要

## 6. LLM向けレスポンス最適化

`formatResponse` 関数で全ツールのレスポンスを統一整形:
- 成功時: `✅ {source}\n\n{JSON data}\n\n取得時刻: {timestamp}`
- 失敗時: `❌ エラー [{source}]\n{error}\n\n取得時刻: {timestamp}`
- 横断検索: Markdown セクション分けでLLMが解釈しやすい構造化出力

## 7. 将来拡張

### Phase 4: 自治体クロールデータ統合
### Phase 5: 企業情報・論文情報統合
### Phase 6: 横断分析エンジン（クロスリファレンス）
