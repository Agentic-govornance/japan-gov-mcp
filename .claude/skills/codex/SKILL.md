# Codex Read-Only Skill

読み取り専用モードでOpenAI Codex CLIを実行します。
コードレビュー、分析、仕様調査、テスト計画に使用。

## 実行コマンド

```bash
codex exec --full-auto --sandbox read-only --cd "$ARGUMENTS_DIR" "$ARGUMENTS_PROMPT"
```

## パラメータ

- `ARGUMENTS_DIR`: 作業ディレクトリ（デフォルト: プロジェクトルート）
- `ARGUMENTS_PROMPT`: Codexに送る指示文

## 用途

- コードレビュー・品質分析
- API仕様調査・ドキュメント確認
- テスト計画の立案
- アーキテクチャ分析

## 注意事項

- ファイルの変更は行いません（read-only sandbox）
- 結果はstdoutに出力されます
