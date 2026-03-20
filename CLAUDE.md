# CLAUDE.md — japan-gov-mcp プロジェクト指示書

## プロジェクト概要
日本の中央省庁が提供する30+ APIを統合した MCP (Model Context Protocol) サーバー。
97ツール（シナリオ複合ツール9個含む）を13ドメインモジュールに分割管理。

## ディレクトリ構造
```
japan-gov-mcp/
├── CLAUDE.md              ← 今読んでいるファイル
├── .claude/skills/        ← Codex連携用Skill定義
│   ├── codex/SKILL.md     ← 読み取り専用（レビュー・分析）
│   └── codex-write/SKILL.md ← 書き込み可（実装・テスト作成）
├── .codex/                ← Codex用タスク定義ファイル
├── docs/
│   ├── ARCHITECTURE.md    ← アーキテクチャ設計書
│   ├── API_CATALOG.md     ← 全API仕様カタログ
│   ├── TASK_PLAN.md       ← 実装タスク一覧・進捗管理
│   └── CODEX_TASKS.md     ← Codex タスクテンプレート集
├── src/
│   ├── index.ts           ← MCPサーバーエントリポイント（81行）
│   ├── tools/             ← ツール登録モジュール（13ドメイン）
│   │   ├── types.ts       ← ToolCategory, ToolMetadata, ServerConfig
│   │   ├── helpers.ts     ← need(), json(), txt(), formatResponse()
│   │   ├── metadata.ts    ← 全97ツールメタデータ集約
│   │   ├── statistics.ts  ← e-Stat 10ツール（SSDS比較・時系列・相関含む）
│   │   ├── resas.ts       ← RESAS 8ツール（2025-03-24廃止、deprecated）
│   │   ├── corporate.ts   ← dashboard/houjin/gbiz/edinet 6ツール
│   │   ├── law.ts         ← 法令API 3ツール
│   │   ├── realestate.ts  ← 不動産/国交省DPF 4ツール
│   │   ├── opendata-geo.ts← オープンデータ/地理空間/安全/求人 11ツール
│   │   ├── weather-disaster.ts ← 気象/防災 12ツール
│   │   ├── academic.ts    ← 学術/科学/環境 14ツール
│   │   ├── urban.ts       ← PLATEAU/パブコメ/ミラサポ 7ツール
│   │   ├── health-finance.ts ← NDB/日銀 7ツール
│   │   ├── placeholder.ts ← 海しる/ODPT 4ツール（APIキー登録待ち）
│   │   ├── scenarios.ts   ← シナリオ複合 9ツール
│   │   └── integration.ts ← カタログ/横断検索 2ツール
│   ├── providers/         ← 各省庁APIクライアント（23ファイル）
│   │   ├── estat.ts       ← e-Stat (総務省)
│   │   ├── resas.ts       ← RESAS (内閣府, 廃止)
│   │   ├── houjin.ts      ← 法人番号 (国税庁)
│   │   ├── gbiz.ts        ← gBizINFO (経済産業省)
│   │   ├── edinet.ts      ← EDINET (金融庁)
│   │   ├── law.ts         ← 法令API
│   │   ├── dashboard.ts   ← 統計ダッシュボード
│   │   ├── realestate.ts  ← 不動産情報ライブラリ
│   │   ├── datacatalog.ts ← データカタログ (data.go.jp)
│   │   ├── safety.ts      ← 海外安全情報 (外務省)
│   │   ├── hellowork.ts   ← ハローワーク (厚労省)
│   │   ├── agriknowledge.ts ← 農業技術情報 (農研機構)
│   │   ├── weather.ts     ← 気象庁
│   │   ├── disaster.ts    ← 防災 (洪水/河川/交通)
│   │   ├── geo.ts         ← 国土地理院 ジオコーディング
│   │   ├── geoshape.ts    ← 行政区域GeoJSON
│   │   ├── geospatial.ts  ← G空間情報センター
│   │   ├── academic.ts    ← NDL/J-STAGE/CiNii/ジャパンサーチ/IRDB
│   │   ├── kokkai.ts      ← 国会会議録
│   │   ├── kkj.ts         ← 官公需
│   │   ├── science.ts     ← そらまめくん/地質図/JAXA
│   │   ├── boj.ts         ← 日本銀行
│   │   ├── ndb.ts         ← NDBオープンデータ
│   │   ├── mlit-dpf.ts    ← 国交省DPF
│   │   ├── plateau.ts     ← PLATEAU (3D都市モデル)
│   │   ├── pubcomment.ts  ← パブリックコメント
│   │   ├── researchmap.ts ← researchmap (JST)
│   │   ├── mirasapo.ts    ← ミラサポplus (中小企業庁)
│   │   ├── msil.ts        ← 海しる (海上保安庁, 未実装)
│   │   └── odpt.ts        ← ODPT公共交通 (未実装)
│   ├── scenarios/         ← シナリオ複合分析
│   │   ├── regional-analysis.ts
│   │   ├── corporate-analysis.ts
│   │   ├── disaster-analysis.ts
│   │   ├── academic-analysis.ts
│   │   ├── realestate-analysis.ts
│   │   └── economy-analysis.ts
│   └── utils/
│       ├── http.ts        ← 共通HTTP (キャッシュ/レートリミット/リトライ)
│       ├── ssds-registry.ts ← SSDS指標コードレジストリ
│       ├── metric-scope.ts  ← 指標利用可能性チェック
│       ├── merger.ts        ← 市町村合併境界検出
│       └── derived.ts       ← 派生指標計算 (相関/時系列整列)
├── tests/                 ← テストファイル（37ファイル, 397テスト）
│   └── helpers.ts         ← 共通モックユーティリティ
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## ビルド・実行コマンド

```bash
npm install           # 依存関係インストール
npm run build         # TypeScriptコンパイル
npm run typecheck     # 型チェックのみ
npm test              # テスト実行
npm start             # MCPサーバー起動（stdio）
npm run inspect       # MCP Inspector でGUIテスト
```

## コーディング規約

### TypeScript
- strict mode 必須
- 全関数に JSDoc コメント
- Provider は副作用なし（純粋なAPI呼び出しのみ）
- エラーは `ApiResponse<T>` 型で返す（例外を投げない）

### MCP ツール
- ツール名: `{provider}_{action}` 形式（例: `estat_search`）
- 説明文: `【{提供元}】` プレフィックス付き日本語
- Zod スキーマ: 全パラメータに `.describe()` 必須
- **stdout に絶対書かない**（stdio transport が壊れる）→ `console.error()` のみ
- ツール登録: `src/tools/{domain}.ts` の `register(server, config)` パターン
- メタデータ: 各ドメインモジュールで `metadata` をexport → `metadata.ts` で集約

### テスト
- Node.js 標準 `node:test` を使用
- 各Providerに対応するテストファイルを `tests/` に配置
- 共通モック: `tests/helpers.ts` (`setupFetchMock`, `mockJsonResponse` 等)
- APIキーなしでも動くモックテスト
- 実APIテストは `TEST_WITH_REAL_API=1` フラグで切り替え

## 環境変数

| 変数名 | API | 状態 | 取得先 |
|--------|-----|------|--------|
| `ESTAT_APP_ID` | e-Stat | ✅設定済 | https://www.e-stat.go.jp/api/ |
| `EDINET_API_KEY` | EDINET | ✅設定済 | https://disclosure2.edinet-fsa.go.jp/ |
| `RESAS_API_KEY` | RESAS | ❌廃止 | 2025-03-24提供終了 |
| `HOUJIN_APP_ID` | 法人番号 | 未取得 | https://www.houjin-bangou.nta.go.jp/webapi/ |
| `GBIZ_TOKEN` | gBizINFO | 未取得 | https://info.gbiz.go.jp/hojin/api |
| `HELLOWORK_API_KEY` | ハローワーク | 未取得 | https://www.hellowork.mhlw.go.jp/ |
| `REALESTATE_API_KEY` | 不動産情報 | 未取得 | https://www.reinfolib.mlit.go.jp/ |
| `MLIT_DPF_API_KEY` | 国交省DPF | 未取得 | https://www.mlit-data.jp/ |
| `MSIL_API_KEY` | 海しる | 未取得 | https://www.msil.go.jp/ |
| `ODPT_API_KEY` | ODPT公共交通 | 未取得 | https://developer.odpt.org/ |

APIキー不要: 統計ダッシュボード, 法令API, データカタログ, 海外安全情報, 気象庁, J-SHIS, GSI, Geoshape, G空間, NDL, J-STAGE, CiNii, ジャパンサーチ, IRDB, researchmap, AgriKnowledge, そらまめくん, 地質図, JAXA, 国会会議録, 官公需, パブコメ, ミラサポ, PLATEAU, NDB, 日銀, 洪水リスク, 河川水位

## 現在の状態
- [x] プロジェクト初期構成
- [x] 全Provider実装（23プロバイダ, 97ツール, 9シナリオ複合ツール）
- [x] 全API疎通完了: 47 PASS / 0 FAIL / 17 SKIP
- [x] テスト: 397テスト / 397 PASS / 0 FAIL
- [x] アーキテクチャリファクタリング完了（index.ts: 1,691→81行）
- [x] テストヘルパー共通化（tests/helpers.ts）
- [x] キャッシュ層（LRU TTL付き, 256エントリ）
- [x] レートリミッター（Token Bucket, ホスト別）
- [x] 入力バリデーション（Zod全フィールドに制約）
- [x] 自治体分析ユーティリティ（SSDS指標・合併・比較・時系列・相関）
- [x] area-mapping.json: 47都道府県 + 1,918市区町村
- [x] edinet-mapping.json: 10,669 EDINET entries
- [x] e-Stat / EDINET APIキー取得済み
- [ ] 残りAPIキー取得 (法人番号, gBiz, MSIL, ODPT等)
- [ ] EDINET CSV最新版の取得（現在2023-10月版）
- [ ] README完成・公開準備
