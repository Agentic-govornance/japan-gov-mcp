# CODEX_TASKS.md — Codex タスク定義・実行ガイド

## Codex への指示方法（Skill方式）

**MCPは使わない。`codex exec` コマンドで直接実行する。**

### 読み取り専用（レビュー・分析）
```bash
codex exec --full-auto --sandbox read-only --cd /path/to/japan-gov-mcp "<指示>"
```

### 書き込み可能（実装・テスト作成）
```bash
codex exec --full-auto --cd /path/to/japan-gov-mcp "<指示>"
```

### タスクファイルを使う場合
```bash
# タスクファイルの内容をそのまま指示として渡す
codex exec --full-auto --cd /path/to/japan-gov-mcp \
  ".codex/task-003-noauth-apis.md を読んで実行して"
```

---

## タスク一覧

### Task 001: e-Stat Provider 本番品質化

**Codex実行コマンド:**
```bash
# まず調査（read-only）
codex exec --full-auto --sandbox read-only --cd . \
  "src/providers/estat.ts を読んで、e-Stat API v3.0 公式仕様 https://www.e-stat.go.jp/api/api-info/e-stat-manual3-0 と照合して、不足パラメータ・エンドポイントを報告して"

# 次に実装（write）
codex exec --full-auto --cd . \
  ".codex/task-001-estat-provider.md を読んで実行して。estat.ts を改善し tests/estat.test.ts を作成して"
```

**検証:**
```bash
npm run typecheck && npm test
```

---

### Task 002: RESAS Provider 本番品質化

**Codex実行コマンド:**
```bash
codex exec --full-auto --cd . \
  ".codex/task-002-resas-provider.md を読んで実行して。resas.ts にエンドポイント追加し tests/resas.test.ts を作成して"
```

---

### Task 003: キー不要API群一括検証 ← 最初にやるべき

**Codex実行コマンド:**
```bash
codex exec --full-auto --cd . \
  ".codex/task-003-noauth-apis.md を読んで実行して。5つのキー不要APIに実際にリクエストして、レスポンス構造を記録する tests/noauth-apis.test.ts を作って。curlで先にレスポンスを確認してから型定義を書いて"
```

---

### Task 004: 法人番号API検証
```bash
codex exec --full-auto --cd . \
  "法人番号API v4 https://www.houjin-bangou.nta.go.jp/webapi/ の仕様を確認し、src/providers/houjin.ts のパラメータ・レスポンス型を修正して tests/houjin.test.ts を作成して"
```

### Task 005: gBizINFO検証
```bash
codex exec --full-auto --cd . \
  "gBizINFO REST API https://info.gbiz.go.jp/hojin/swagger-ui.html の仕様を確認し、src/providers/gbiz.ts を修正して tests/gbiz.test.ts を作成して"
```

### Task 006: 法令API XML→JSON変換
```bash
codex exec --full-auto --cd . \
  "法令API https://elaws.e-gov.go.jp/apitop/ はXMLを返す。fast-xml-parserを追加して、misc.tsの法令API部分にXML→JSON変換を実装して tests/law.test.ts を作って"
```

### Task 007: キャッシュ層実装
```bash
codex exec --full-auto --cd . \
  "src/utils/cache.ts にin-memory LRUキャッシュを実装して。TTLとmaxSizeを設定可能に。tests/cache.test.ts も作って。docs/CODEX_TASKS.md のTask 007を参照"
```

### Task 008: レスポンス整形
```bash
codex exec --full-auto --cd . \
  "src/utils/formatter.ts を作って。e-StatのVALUE配列→テーブル変換、大量データの先頭N件サマリー、メタ情報の自然言語化を実装して"
```

---

## Codex への一般的な注意事項

1. **TypeScript strict mode** — `any` は最小限に
2. **console.log 禁止** — `console.error` のみ使用可
3. **依存追加は最小限** — Node.js 標準の fetch を使う
4. **テストは node:test** — jest は不要
5. **日本語コメント推奨** — APIの日本語仕様に対応するため
6. **レスポンス型は必ず定義** — `interface EStatStatsListResponse { ... }` 等
