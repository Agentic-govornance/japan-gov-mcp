# INFRASTRUCTURE.md — GCP/GCS 運用ルール

## GCP 環境情報

| 項目 | 値 |
|------|-----|
| **プロジェクトID** | unique-sentinel-473401-s0 |
| **VM名** | instance-20260216-231118 |
| **VMゾーン** | asia-northeast1-c |
| **VM外部IP** | 34.104.169.112 |
| **GCSバケット** | gs://piracy-detector-data/ |
| **VM種別** | Spot VM（低コスト・非保証） |

## 実行環境ルール【重要】

### 基本原則
**ネットワーク処理のみVM上で実行。それ以外はローカルMac（Codex）で実行する。**

### Codex（ローカルMac）の役割
- ✅ コードの実装・修正・実行
- ✅ データ分析・集計・可視化
- ✅ レポート・論文の生成
- ✅ ローカルでのスクリプト実行（Python、Node.js等）
- ✅ 機械学習モデルの訓練・評価
- ✅ データ変換・整形・集計処理

### VM の役割（ネットワーク処理のみ）
- ✅ クローリング・スクレイピング
- ✅ API呼び出し（外部サービスへのアクセス）
- ✅ DNS/WHOIS調査
- ✅ ネットワーク並列処理（50-100同時接続）
- ❌ ローカルで完結するデータ処理は行わない

### 作業フロー

#### パターン1: ネットワーク処理が必要な場合
```
1. Codex がコードを生成
   ↓
2. コードをVMに転送
   ↓
3. VM上でネットワーク処理を実行
   ↓
4. 結果をGCSに保存
   ↓
5. ローカルにダウンロードして分析・可視化
```

#### パターン2: ローカルで完結する処理
```
1. Codex がコードを生成・実行
   ↓
2. データ分析・可視化・レポート生成
   ↓
3. 成果物をGoogle Driveに保存
```

## ネットワーク処理ルール

### VM上での実行（必須）
- クローリング・スクレイピング等のネットワーク処理は **すべてVM上で実行する**
- ローカルMacではネットワーク処理を実行しない
- 理由: 並列処理の高速化、ネットワーク帯域の確保、IPアドレス制限対策

### VM接続方法
```bash
# VM起動
gcloud compute instances start instance-20260216-231118 --zone=asia-northeast1-c

# SSH接続
gcloud compute ssh instance-20260216-231118 --zone=asia-northeast1-c

# VM停止（使用後必須）
gcloud compute instances stop instance-20260216-231118 --zone=asia-northeast1-c
```

## 並列処理ルール

### VM上での並列数
- **最大同時接続数**: 50〜100プロセス
- **推奨ライブラリ**: asyncio + aiohttp（Python）、Promise.all（Node.js）
- **並列制御**: セマフォ、レート制限を必ず実装する

### ローカルMac（Codex）での並列数
- **最大並列数**: 5〜6プロセス
- **用途**: コード実装、データ処理、分析、レポート生成

### 進捗管理・チェックポイント方式
- 処理中断時も途中から再開できる設計にすること
- 各タスクの開始・終了・エラーをログに記録する
- 進捗状況をファイル（JSON/CSV）に保存し、再実行時にスキップできるようにする

例:
```python
# progress.json に進捗を保存
{"completed": ["task1", "task2"], "failed": ["task5"]}
# 再実行時は completed をスキップ
```

## データ格納ルール

### ディレクトリ構成
```
gs://piracy-detector-data/
├── piracy_detector/      ← 海賊版検知プロジェクト（全データ）
├── japan-gov-mcp/        ← 政府MCPプロジェクト（全データ）
├── logs/                 ← 実行ログ
│   ├── YYYY-MM-DD/       ← 日付ごとのログ
│   └── errors/           ← エラーログ
└── tmp/                  ← 一時ファイル（定期削除対象）
```

### 格納先の使い分け

| データ種別 | 格納先 | 例 |
|-----------|--------|-----|
| **作業中の一時データ** | VM内ディスク (`/home/reikumaki/work/`) | スクレイピング中間結果、処理途中のCSV |
| **処理完了後の成果物** | GCS (`gs://piracy-detector-data/`) | 最終集計結果、分析データ、モデル |
| **実行ログ** | GCS (`gs://piracy-detector-data/logs/`) | 実行履歴、エラーログ |
| **最終レポート・論文** | ローカルGoogle Drive | PDF、DOCX、発表資料 |

### 自動保存の実装
- タスク完了時に自動的にGCSに保存する設計にすること
- 例: スクリプト終了時に `gsutil cp` または Python `google-cloud-storage` ライブラリで自動アップロード

```python
# 処理完了後に自動保存
from google.cloud import storage
client = storage.Client()
bucket = client.bucket('piracy-detector-data')
blob = bucket.blob('piracy_detector/result_20260217.csv')
blob.upload_from_filename('result.csv')
```

### 一時ファイルの削除
- `gs://piracy-detector-data/tmp/` は定期的に削除する
- 7日以上前のファイルは自動削除対象

## VM運用ルール

### Spot VMの特性
- **低コスト**: 通常VMの約1/3の料金
- **不安定性**: 予告なく停止される可能性がある
- **対策**: チェックポイント方式で必ず設計すること

### VM使用時の手順
1. **起動**: `gcloud compute instances start instance-20260216-231118 --zone=asia-northeast1-c`
2. **接続**: `gcloud compute ssh instance-20260216-231118 --zone=asia-northeast1-c`
3. **作業**: スクリプト実行、データ処理
4. **保存**: 結果をGCSに保存
5. **停止**: `gcloud compute instances stop instance-20260216-231118 --zone=asia-northeast1-c`

### 停止忘れ防止
- **使用後は必ずVMを停止する**（課金削減のため）
- 自動停止スクリプトの設定を推奨

```bash
# 1時間後に自動停止（VM上で実行）
echo "sudo shutdown -h +60" | at now
```

## VM上の環境構築

### 必須ソフトウェア
- Python 3.11+
- Node.js 20+
- pip, npm
- gsutil (Google Cloud SDK)
- git

### プロジェクト作業ディレクトリ
```bash
# VM上のディレクトリ構成
/home/reikumaki/work/
├── piracy_detector/       ← 海賊版検知プロジェクト
│   ├── src/
│   ├── data/             ← GCSからpullした作業用データ
│   └── output/           ← 実行結果（GCSにpush）
└── japan-gov-mcp/        ← 政府MCPプロジェクト
    ├── src/
    ├── data/
    └── output/
```

### データのpull/push
```bash
# GCS → VM（作業開始時）
gsutil -m rsync -r gs://piracy-detector-data/piracy_detector/data/ ~/work/piracy_detector/data/

# VM → GCS（作業完了時）
gsutil -m rsync -r ~/work/piracy_detector/output/ gs://piracy-detector-data/piracy_detector/output/
```

### Python環境
```bash
# 仮想環境作成
python3 -m venv ~/work/piracy_detector/venv
source ~/work/piracy_detector/venv/bin/activate

# 依存関係インストール
pip install aiohttp asyncio pandas google-cloud-storage
```

### Node.js環境
```bash
cd ~/work/japan-gov-mcp
npm install
```

## ローカルMac（Codex）の役割

### 実行可能な作業
1. **コードの実装・修正・実行**
   - Pythonスクリプトの作成・実行
   - Node.jsスクリプトの作成・実行
   - データ処理・分析・集計

2. **データ分析・可視化**
   - pandas、numpy、matplotlib等を使った分析
   - データ変換・整形・フィルタリング
   - グラフ・チャートの作成

3. **機械学習・AI**
   - モデルの訓練・評価
   - 特徴量エンジニアリング
   - 予測・推論

4. **レポート・論文の生成**
   - Jupyter Notebookでの分析レポート
   - PDF、DOCX、Markdown形式の文書作成

### 禁止される作業（VM上で実行）
- ❌ ネットワーク処理（クローリング、スクレイピング）
- ❌ 外部APIへの大量呼び出し
- ❌ DNS/WHOIS調査
- ❌ 並列ネットワーク処理（50-100同時接続）

### 理由
- **ローカルMac**: データ処理・分析に最適（開発環境が整っている）
- **VM**: ネットワーク帯域が広く、並列処理に適している
- **役割分担**: ネットワーク処理はVMで、それ以外はローカルで実行

## セキュリティ・認証情報管理

### APIキー・認証情報の保管
- VM上: `/home/reikumaki/.env` に保存
- GCS上には **絶対に保存しない**
- ローカルMacには保存しない

### .gitignore
```
.env
*.key
credentials.json
```

## ログ管理

### ログの保存先
```bash
# VM上での実行ログ
~/work/piracy_detector/logs/run_20260217_143022.log

# GCSへの自動アップロード
gsutil cp ~/work/piracy_detector/logs/*.log gs://piracy-detector-data/logs/$(date +%Y-%m-%d)/
```

### ログの内容
- 実行開始時刻・終了時刻
- 処理件数
- エラー発生時の詳細（トレースバック、対象URL等）
- 進捗状況（10%刻み等）

## よくあるタスクのコマンド例

### 1. ローカルからGCSにデータアップロード
```bash
gsutil -m rsync -r ~/local/piracy_detector/ gs://piracy-detector-data/piracy_detector/
```

### 2. GCSからVMにデータダウンロード
```bash
# VM上で実行
gsutil -m rsync -r gs://piracy-detector-data/piracy_detector/ ~/work/piracy_detector/
```

### 3. VM上でスクリプト実行
```bash
# VM上で実行
cd ~/work/piracy_detector
python3 scraper.py --parallel 100 --checkpoint progress.json
```

### 4. VM上から結果をGCSにアップロード
```bash
# VM上で実行
gsutil -m rsync -r ~/work/piracy_detector/output/ gs://piracy-detector-data/piracy_detector/output/
```

### 5. GCSからローカルに結果のみダウンロード
```bash
# ローカルMacで実行（閲覧・レポート作成用）
gsutil -m rsync -r gs://piracy-detector-data/piracy_detector/output/ ~/Desktop/results/
```

## トラブルシューティング

### VMに接続できない
```bash
# VMが停止していないか確認
gcloud compute instances describe instance-20260216-231118 --zone=asia-northeast1-c

# 起動
gcloud compute instances start instance-20260216-231118 --zone=asia-northeast1-c
```

### GCSへのアップロードが遅い
```bash
# -m オプション（並列アップロード）を使用
gsutil -m rsync -r <source> <destination>
```

### Spot VMが停止された
- チェックポイントファイル（progress.json等）を確認
- VM再起動後、チェックポイントから再開

---

**最終更新**: 2026-02-17
**作成者**: Claude Code & Codex
**バージョン**: 1.0.0
