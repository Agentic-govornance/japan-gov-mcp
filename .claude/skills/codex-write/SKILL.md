# Codex Write Skill

書き込み可能モードでOpenAI Codex CLIを実行します。
実装、テスト作成、バグ修正に使用。

## 実行コマンド

```bash
codex exec --full-auto --cd "$ARGUMENTS_DIR" "$ARGUMENTS_PROMPT"
```

## パラメータ

- `ARGUMENTS_DIR`: 作業ディレクトリ（デフォルト: プロジェクトルート）
- `ARGUMENTS_PROMPT`: Codexに送る指示文

## 用途

- 個別Providerの実装
- テスト作成・修正
- バグ修正
- リファクタリング

## 注意事項

- 実行前に `git status` で変更状態を確認してください
- 実行後に `git diff` で変更内容を確認してください
- sandboxなし（ファイル変更可能）
