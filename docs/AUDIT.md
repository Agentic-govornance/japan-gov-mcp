# 監査・再現性ガイド

## 目次

- [なぜ監査ログが必要か](#なぜ監査ログが必要か)
- [推奨ログ形式: NDJSON](#推奨ログ形式-ndjson)
- [必須ログフィールド](#必須ログフィールド)
- [研究・論文利用のワークフロー](#研究論文利用のワークフロー)
- [プライバシーとセキュリティ](#プライバシーとセキュリティ)
- [実装方法](#実装方法)

---

## なぜ監査ログが必要か

japan-gov-mcpを**研究・政策立案・データ分析**に使用する際、以下の理由で監査ログが必要です：

### 1. 再現性の確保

学術研究や政策提言では、**いつ・どのAPIを・どのパラメータで呼び出したか**を記録することで、第三者が同じ結果を再現できます。

**例**:
```
論文: 「2024年の東京都の健診データ分析」
→ ログに "2024-12-15 10:30:00 JST に ndb_inspection_stats を prefectureCode=13, year=2024 で実行" と記録
→ 査読者が同じパラメータで検証可能
```

### 2. データソースの明示

政府APIは**データが更新される**ため、取得時期によって結果が異なります。監査ログがあれば：

- 「この数値は2024年12月15日時点のe-Stat統計表0003410379から取得」と証跡を残せる
- データの変更履歴を追跡可能
- レポート作成時の根拠を明示できる

### 3. エラー調査・デバッグ

APIエラーやタイムアウトが発生した際、ログがあれば：

- どのツール呼び出しで失敗したか特定
- パラメータの誤りを確認
- レートリミット到達の検出

### 4. コンプライアンス

公的機関や企業がjapan-gov-mcpを利用する場合、以下の要件を満たす必要があります：

- **アクセスログの保存**: 誰が・いつ・どのデータにアクセスしたか
- **変更履歴の追跡**: データ取得時のバージョン管理
- **外部監査対応**: 第三者機関による検証

---

## 推奨ログ形式: NDJSON

**NDJSON (Newline Delimited JSON)** を推奨します。

### NDJSONとは

各行が独立したJSON objectで、改行（`\n`）で区切られた形式：

```json
{"timestamp":"2024-12-15T10:30:00Z","tool":"ndb_inspection_stats","params":{"itemName":"BMI","prefectureName":"東京都"},"status":"success","duration_ms":1250}
{"timestamp":"2024-12-15T10:30:05Z","tool":"dashboard_data","params":{"indicatorCode":"A1101","regionCode":"13000"},"status":"success","duration_ms":890}
{"timestamp":"2024-12-15T10:30:10Z","tool":"estat_search","params":{"surveyName":"国勢調査"},"status":"error","error":"ESTAT_APP_ID is not set","duration_ms":5}
```

### NDJSONのメリット

| 利点 | 説明 |
|------|------|
| **ストリーム処理可能** | ファイル全体を読まずに1行ずつ処理できる（巨大ログでもメモリ効率的） |
| **追記専用** | 既存ファイルに新しいログを追記するだけ（ロック不要） |
| **行単位で独立** | 1行が破損しても他の行は影響を受けない |
| **ツールサポート** | jq, grep, awk等のUNIXツールで簡単に検索・集計可能 |

### NDJSONの使用例

**検索**: 特定ツールのログを抽出
```bash
grep '"tool":"ndb_inspection_stats"' audit.log
```

**集計**: エラー件数をカウント
```bash
grep '"status":"error"' audit.log | wc -l
```

**整形**: jq で特定フィールドのみ表示
```bash
cat audit.log | jq -r '.timestamp + " " + .tool + " " + .status'
```

---

## 必須ログフィールド

監査ログには以下のフィールドを含めることを推奨します：

### 基本フィールド

| フィールド | 型 | 説明 | 例 |
|-----------|-----|------|-----|
| `timestamp` | string | ISO 8601形式のタイムスタンプ（UTC） | `"2024-12-15T10:30:00.123Z"` |
| `tool` | string | 呼び出されたツール名 | `"ndb_inspection_stats"` |
| `params` | object | ツールに渡されたパラメータ | `{"itemName":"BMI","prefectureName":"東京都"}` |
| `status` | string | 実行結果（`success` / `error`） | `"success"` |
| `duration_ms` | number | 実行時間（ミリ秒） | `1250` |

### オプショナルフィールド

| フィールド | 型 | 説明 | 例 |
|-----------|-----|------|-----|
| `error` | string | エラーメッセージ（`status="error"` の場合） | `"ESTAT_APP_ID is not set"` |
| `source` | string | データソース（API名） | `"NDB/inspection_stats"` |
| `user` | string | ユーザーID（マルチユーザー環境の場合） | `"user123"` |
| `session_id` | string | セッションID（複数リクエストを紐付け） | `"sess_abc123"` |
| `api_key_hash` | string | 使用したAPIキーのハッシュ値（完全な値は記録しない） | `"sha256:a1b2c3..."` |
| `result_size` | number | レスポンスのバイト数 | `45678` |
| `externalEndpoint` | string | 外部APIエンドポイントURL（機密情報はマスキング済み） | `"https://api.e-stat.go.jp/rest/3.0/app/getStatsList?appId=***MASKED***"` |
| `httpStatus` | number | 外部APIのHTTPステータスコード | `200` |

### ログ例（完全版）

```json
{
  "timestamp": "2024-12-15T10:30:00.123Z",
  "tool": "scenario_regional_health_economy",
  "params": {
    "prefectureCode": "13",
    "year": 2024
  },
  "status": "success",
  "duration_ms": 3450,
  "source": "Scenario/regional_health_economy",
  "session_id": "sess_abc123",
  "user": "researcher@example.com",
  "result_size": 123456,
  "externalEndpoint": "https://dashboard.e-stat.go.jp/api/1.0/Json/getData?indicatorCode=A1101&regionCode=13000",
  "httpStatus": 200
}
```

```json
{
  "timestamp": "2024-12-15T10:30:05.678Z",
  "tool": "estat_search",
  "params": {
    "surveyName": "国勢調査"
  },
  "status": "error",
  "error": "ESTAT_APP_ID is not set. Register at https://www.e-stat.go.jp/api/",
  "duration_ms": 5,
  "source": "eStat/search",
  "externalEndpoint": "https://api.e-stat.go.jp/rest/3.0/app/getStatsList?appId=***MASKED***&surveyName=%E5%9B%BD%E5%8B%A2%E8%AA%BF%E6%9F%BB",
  "httpStatus": 401
}
```

---

## 研究・論文利用のワークフロー

### 1. データ収集フェーズ

**手順**:
1. 環境変数 `GOV_MCP_AUDIT_LOG_PATH` を設定
   ```bash
   export GOV_MCP_AUDIT_LOG_PATH=/path/to/audit.log
   ```
2. MCPサーバーを起動
3. ツールを使用してデータを収集
4. 監査ログが自動的に記録される

**確認**:
```bash
tail -f /path/to/audit.log  # リアルタイムでログを確認
```

### 2. 分析・執筆フェーズ

**手順**:
1. 監査ログから使用したツールを抽出
   ```bash
   cat audit.log | jq -r '.tool' | sort | uniq
   ```
2. 各ツールの呼び出し回数を集計
   ```bash
   cat audit.log | jq -r '.tool' | sort | uniq -c
   ```
3. エラーが発生したツールを確認
   ```bash
   cat audit.log | jq 'select(.status=="error")'
   ```
4. 論文の「データ収集方法」セクションに記載
   ```
   本研究では、japan-gov-mcpを用いて以下のデータを取得した：
   - NDB OpenData Hub: 2024年の東京都BMI統計（2024-12-15取得）
   - 統計ダッシュボード: 人口推移データ（指標A1101, 2024-12-15取得）
   - 日本銀行: マネーストックM2時系列（2020-2024, 2024-12-15取得）
   ```

### 3. 査読対応フェーズ

**査読者からの質問**:
> 「表3のBMI平均値は、どのAPIからいつ取得したのか？」

**回答**:
```bash
# 監査ログから該当ツール呼び出しを検索
cat audit.log | jq 'select(.tool=="ndb_inspection_stats" and .params.itemName=="BMI")'
```

結果:
```json
{
  "timestamp": "2024-12-15T10:30:00Z",
  "tool": "ndb_inspection_stats",
  "params": {"itemName":"BMI","prefectureName":"東京都","format":"summary"},
  "status": "success"
}
```

**査読回答**:
> 「表3のBMI平均値は、2024年12月15日10:30 UTCに NDB OpenData Hub API (ndb_inspection_stats) で取得した東京都の集計データです。監査ログを補足資料として提出します。」

### 4. 再現性検証フェーズ

**第三者による再現**:
1. 監査ログを受け取る
2. 同じパラメータでツールを実行
   ```bash
   # ログから抽出したパラメータで実行
   japan-gov-mcp call ndb_inspection_stats '{"itemName":"BMI","prefectureName":"東京都","format":"summary"}'
   ```
3. 結果を比較（APIデータが更新されていれば差分が出る）
4. 差分がある場合、「元論文は2024年12月15日時点のデータ」と注釈

---

## プライバシーとセキュリティ

### 1. APIキーの取り扱い

**⚠️ 絶対にAPIキーをログに記録しない**

- パラメータに含まれる `apiKey`, `token`, `appId` は**マスキング**する
- 代わりにハッシュ値を記録（どのキーを使ったかだけ追跡）

**実装例**:
```typescript
function maskSensitiveParams(params: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...params };
  const sensitiveKeys = ['apiKey', 'token', 'appId', 'password', 'secret'];

  for (const key of sensitiveKeys) {
    if (masked[key]) {
      masked[key] = '***MASKED***';
    }
  }

  return masked;
}
```

### 2. 個人情報の取り扱い

NDB等の健康データは**集計データのみ**で個人情報を含みませんが、以下に注意：

- ユーザーID（`user` フィールド）: 匿名化またはハッシュ化
- セッションID: 個人を特定できないランダム文字列を使用
- IPアドレス: 記録しない（または匿名化）

### 3. ログファイルのアクセス制御

- ログファイルは**読み取り専用**に設定（`chmod 600`）
- 定期的にローテーション・アーカイブ（`logrotate` 等）
- 保管期限を設定（例: 3年間保存後削除）

---

## 実装方法

japan-gov-mcpでは、**共通ロガー**（`src/lib/auditLogger.ts`）を提供します。

### 基本的な使い方

```typescript
import { withAudit } from './lib/auditLogger.js';

// ツール関数をwithAuditでラップ
const auditedTool = withAudit('ndb_inspection_stats', async (params) => {
  return await ndb.getInspectionStats(params);
});

// 実行すると自動的にログが記録される
const result = await auditedTool({ itemName: 'BMI', prefectureName: '東京都' });
```

### 環境変数設定

```bash
# 監査ログを有効化
export GOV_MCP_AUDIT_LOG_PATH=/var/log/japan-gov-mcp/audit.log

# MCPサーバー起動
node build/index.js
```

### ログ確認

```bash
# リアルタイム監視
tail -f /var/log/japan-gov-mcp/audit.log

# エラーのみ表示
grep '"status":"error"' /var/log/japan-gov-mcp/audit.log

# ツール別集計
cat /var/log/japan-gov-mcp/audit.log | jq -r '.tool' | sort | uniq -c | sort -rn
```

---

## まとめ

監査ログは、japan-gov-mcpを**学術研究・政策立案・データ分析**に使う際の必須要件です。

**重要ポイント**:
1. **NDJSON形式**で記録（ストリーム処理可能）
2. **timestamp, tool, params, status, duration_ms**は必須
3. **APIキーは絶対に記録しない**（マスキング必須）
4. **論文・レポートにはログを補足資料として添付**
5. **第三者が再現できるよう、取得日時とパラメータを明示**

**関連ドキュメント**:
- [PROMPTS.md](./PROMPTS.md) — ツール使用プロンプトガイド
- [SCENARIOS.md](./SCENARIOS.md) — シナリオ複合ツール詳細
- [ARCHITECTURE.md](./ARCHITECTURE.md) — システム設計・拡張方法

**実装の詳細**: `src/lib/auditLogger.ts` を参照してください。
