# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-20

### 🎉 Initial Release

japan-gov-mcp の最初の安定版リリースです。日本の中央省庁が提供する23種類のAPIを統合し、80のツール（シナリオ複合ツール9個含む）でオープンデータに統合アクセスできます。

### Added

#### Core Features
- **23 API / 80 ツール** の統合MCPサーバー
- **シナリオ複合ツール 9個** - 複数APIを組み合わせた政策分析パターン
- **横断検索** (`gov_cross_search`) - 複数APIを一括検索
- **監査ログ機能** - 研究・政策分析での再現性確保

#### API Coverage

**統計・経済データ**:
- e-Stat（総務省） - 国勢調査, GDP, CPI, 家計調査等
- 統計ダッシュボード（総務省） - 約6,000系列の統計指標
- NDB OpenData Hub（厚労省） - 特定健診データ
- 日本銀行時系列統計 - マネーストック, CPI, 為替レート

**企業・法人データ**:
- 法人番号（国税庁）
- gBizINFO（経産省）
- EDINET（金融庁）

**法令・地理・防災**:
- 法令API V2（デジタル庁/e-Gov）
- 気象庁防災情報
- J-SHIS 地震ハザード（防災科研）
- 国土地理院ジオコーディング
- Geoshape (NII) - 市区町村境界GeoJSON
- 浸水ナビ・河川水位（国交省）

**学術・文化データ**:
- 国立国会図書館サーチ
- J-STAGE（科学技術振興機構）
- CiNii Research（国立情報学研究所）
- ジャパンサーチ（デジタル庁）
- AgriKnowledge（農研機構）

**その他**:
- 不動産情報ライブラリ（国交省）
- 国交省データプラットフォーム
- データカタログ（デジタル庁）
- G空間情報センター
- 国会会議録検索
- 官公需情報ポータル
- そらまめくん（環境省）
- シームレス地質図（産総研）
- JAXA G-Portal
- 海外安全情報（外務省）
- ハローワーク求人

#### Documentation
- **README.md** - クイックスタート・API一覧
- **SCENARIOS.md** - 全9シナリオの詳細ガイド
- **PROMPTS.md** - LLMエージェント向けプロンプトテンプレート
- **AUDIT.md** - 監査ログ・再現性ガイド
- **ARCHITECTURE.md** - システム設計と拡張方法
- **API_CATALOG.md** - 全API仕様一覧

#### Infrastructure
- **LRU キャッシュ** - 3段階（LONG: 24h, MEDIUM: 1h, SHORT: 5min）
- **Token Bucket レートリミット** - API別に自動調整
- **監査ログ** - NDJSON形式、環境変数で制御
- **機密情報マスキング** - APIキー等を自動マスク
- **233テスト** - 全51 test suites、完全なカバレッジ

### Features

#### Scenario Composite Tools (9)
1. **地域防災リスク評価** - 地震・浸水・河川リスクを統合評価
2. **学術研究トレンド分析** - NDL + J-STAGE + CiNii + ジャパンサーチを横断検索
3. **分野別トレンド比較** - 複数テーマの研究動向を並列比較
4. **全国経済サマリー** - 主要経済指標を一括取得
5. **地域医療×マクロ経済分析** - NDB健診データ + 経済指標を統合
6. **労働市場需給分析** - ハローワーク求人 + 労働統計
7. **企業情報統合分析** - 法人番号 + gBizINFO + EDINET
8. **不動産×人口動態分析** - 不動産取引 + 地価 + 人口統計
9. **地域経済総合分析** - GDP + 産業統計 + インフラデータ

#### Audit Logging
- **NDJSON形式** - ストリーム処理可能
- **必須フィールド** - timestamp, tool, params, status, duration_ms
- **オプショナルフィールド** - source, result_size, externalEndpoint, httpStatus
- **機密情報マスキング** - APIキー、トークン等を自動マスク
- **環境変数制御** - `GOV_MCP_AUDIT_LOG_PATH` で有効化

### Technical Details

- **言語**: TypeScript 5.8.3
- **ランタイム**: Node.js >=22
- **依存関係**:
  - `@modelcontextprotocol/sdk` ^1.12.1
  - `zod` ^3.24.4
- **ライセンス**: MIT
- **テスト**: 233テスト（51 test suites）全pass

### Notes

- **RESAS API は廃止済み**（2025-03-24 提供終了） - 代替: e-Stat, 統計ダッシュボード, 国交省DPF
- **NDB は集計データのみ** - 個票レベルの推論は禁止
- **APIキー不要のツール約50個** - インストール直後から利用可能

### Links

- [GitHub Repository](https://github.com/reikumaki/japan-gov-mcp)
- [Documentation](https://github.com/reikumaki/japan-gov-mcp#readme)
- [Issues](https://github.com/reikumaki/japan-gov-mcp/issues)

---

## [Unreleased]

### Future Plans
- 実API検証（APIキー取得して動作確認）
- MCP Inspector でのGUIテスト
- Claude Desktop での統合テスト
- GitHub badges 追加（test coverage, npm version）
- 追加API対応（海しる, ODPT等）

[1.0.0]: https://github.com/reikumaki/japan-gov-mcp/releases/tag/v1.0.0
[Unreleased]: https://github.com/reikumaki/japan-gov-mcp/compare/v1.0.0...HEAD
