# japan-gov-mcp 完全セットアップガイド（ゼロベース）

---

## Phase 0: 前提ツールのインストール

### 0-1. Node.js（まだ入ってなければ）

**Mac:**
```bash
# Homebrewが入ってなければ先に:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.jsインストール
brew install node

# 確認
node --version   # v18以上ならOK
npm --version
```

**Windows:**
https://nodejs.org/ からLTS版をダウンロードしてインストーラ実行。

### 0-2. Claude Code

```bash
# インストール
npm install -g @anthropic-ai/claude-code

# ログイン（ブラウザが開く → Anthropicアカウントでログイン）
claude login

# 確認
claude --version
```

### 0-3. Codex CLI

```bash
# インストール
npm install -g @openai/codex

# ログイン（ブラウザが開く → OpenAIアカウントでログイン）
codex login

# 確認
codex --version
```

### 0-4. Git（まだ入ってなければ）

**Mac:**
```bash
# Xcodeコマンドラインツールに含まれる
xcode-select --install
```

**Windows:**
https://git-scm.com/ からダウンロード。

---

## Phase 1: プロジェクト配置

### 1-1. ダウンロードしたtar.gzを展開

```bash
# 作業ディレクトリに移動（好きな場所でOK）
cd ~/Projects
# なければ作る: mkdir -p ~/Projects && cd ~/Projects

# 展開
tar xzf ~/Downloads/japan-gov-mcp.tar.gz

# 移動
cd japan-gov-mcp
```

### 1-2. 依存パッケージをインストール

```bash
npm install
```
→ `node_modules/` フォルダが作られる。数秒で終わる。

### 1-3. ビルド確認

```bash
npm run build
```
→ `build/` フォルダが作られる。エラーが出なければOK。

### 1-4. Git初期化（Codex連携に必要）

```bash
git init
git add -A
git commit -m "initial setup"
```

---

## Phase 2: APIキーの取得・設定

### 2-1. APIキーを取得する

最低限2つ取る（各5分程度、無料）:

**e-Stat（総務省統計局）:**
1. https://www.e-stat.go.jp/api/ にアクセス
2. 「ユーザ登録」→ メールアドレス登録 → 確認メール → パスワード設定
3. ログイン → 「アプリケーションIDの取得」 → URL等を入力
4. **appId** が発行される（英数字の文字列）

**RESAS（内閣府）:**
1. https://opendata.resas-portal.go.jp/ にアクセス
2. 「利用登録」→ メールアドレス登録 → 確認メール → 情報入力
3. **APIキー** がメールで届く

### 2-2. 環境変数ファイルを作る

```bash
cp .env.example .env
```

### 2-3. .envファイルを編集

お好みのエディタで `.env` を開く:
```bash
# Mac
open -e .env
# または
nano .env
# または
code .env   # VS Code
```

以下の行を見つけてキーを入れる:
```
ESTAT_APP_ID=ここに取得したappIdを貼る
RESAS_API_KEY=ここに取得したAPIキーを貼る
```

保存して閉じる。

> ※ 他のキー（法人番号、gBizINFO等）は後から追加でOK。
> ※ 6つのAPIはキー不要で即使える。

---

## Phase 3: Claude Codeを起動して作業開始

### 3-1. プロジェクトディレクトリでClaude Codeを起動

```bash
cd ~/Projects/japan-gov-mcp   # プロジェクトのルートにいることを確認
claude
```

→ ターミナルがClaude Codeのインターフェースに変わる。

### 3-2. 最初に入力する指示

Claude Codeのプロンプトに以下を貼る:

```
CLAUDE.md を読んで、プロジェクトの全体像を把握して。

次に、最初のタスクとして task-003（キー不要API群の検証）を実行する。

手順:
1. .codex/task-003-noauth-apis.md を読む
2. codex exec で Codex に実装を委任する：
   codex exec --full-auto --cd . ".codex/task-003-noauth-apis.md を読んで実行して。5つのキー不要APIに実際にHTTPリクエストして、レスポンス構造を記録する tests/noauth-apis.test.ts を作って"
3. Codex の出力をターミナルで監視する
4. 完了したら git diff でレビュー
5. npm run typecheck でエラーチェック
6. 問題なければ git commit
```

### 3-3. 何が起きるか

1. Claude Code が CLAUDE.md を読む → プロジェクト理解
2. Claude Code が `codex exec ...` を実行する
3. ターミナルに Codex の作業内容がリアルタイムで流れる
   - APIにcurlでリクエスト
   - レスポンス構造を確認
   - テストファイルを作成
4. Codex 完了後、Claude Code が結果をレビュー
5. 問題なければコミット

### 3-4. task-003 が終わったら次のタスクへ

Claude Codeに:
```
task-003 完了。TASK_PLAN.md の 003 を ✅ にして。

次は task-001（e-Stat Provider）。
.codex/task-001-estat-provider.md を読んで、Codex に実装させて。
```

---

## Phase 4: MCPサーバーとして使う

### 4-1. Claude Desktop に登録

Claude Desktop アプリの設定ファイルを編集:

**Mac:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
# VS Codeがなければ: nano でも open -e でもOK
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

以下を書く（パスは自分の環境に合わせる）:

```json
{
  "mcpServers": {
    "japan-gov": {
      "command": "node",
      "args": ["/Users/あなたのユーザ名/Projects/japan-gov-mcp/build/index.js"],
      "env": {
        "ESTAT_APP_ID": "あなたのappId",
        "RESAS_API_KEY": "あなたのAPIキー"
      }
    }
  }
}
```

### 4-2. Claude Desktop を再起動

アプリを完全に終了して再起動。
→ チャット画面の入力欄に 🔧 アイコンが出る → japan-gov のツールが使える。

### 4-3. 動作確認

Claude Desktop のチャットで:
```
APIの設定状況を確認して
```
→ `gov_api_catalog` ツールが呼ばれ、12 API の設定状況が表示される。

```
東京都の人口推移を教えて
```
→ `resas_population` ツールが呼ばれ、データが返る。

---

## トラブルシューティング

### `codex: command not found`
```bash
npm install -g @openai/codex
codex login
```

### `claude: command not found`
```bash
npm install -g @anthropic-ai/claude-code
claude login
```

### `npm run build` でエラー
```bash
rm -rf node_modules
npm install
npm run build
```

### Codex が途中で止まった
Claude Code 上で Ctrl+C で中断 → 再実行。
Skill方式なのでリアルタイムで進捗が見える。止まっていたら即中断できる。

### Claude Desktop でツールが出ない
- `claude_desktop_config.json` のパスが正しいか確認
- `npm run build` が成功しているか確認
- Claude Desktop を完全に再起動（タスクバーから終了→再起動）

### APIキーエラー
```bash
cat .env  # キーが正しく入っているか確認
```
`.env` は `=` の前後にスペースを入れない:
```
# ✅ 正しい
ESTAT_APP_ID=abc123
# ❌ 間違い
ESTAT_APP_ID = abc123
```

---

## 全体の流れ（まとめ）

```
インストール        npm -g install @anthropic-ai/claude-code @openai/codex
  ↓
プロジェクト展開    tar xzf → cd → npm install → npm run build → git init
  ↓
APIキー取得        e-Stat + RESAS（各5分、無料）→ .env に書く
  ↓
Claude Code起動    claude
  ↓
最初の指示         「CLAUDE.md読んで、task-003 から始めて」
  ↓
Codex が実装       /codex-write Skill でリアルタイム進捗監視
  ↓
レビュー・コミット  git diff → typecheck → commit
  ↓
繰り返し           task-001 → task-002 → ... と進める
  ↓
MCPとして利用      Claude Desktop の設定ファイルに登録
```
