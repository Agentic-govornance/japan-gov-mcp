# japan-gov-mcp

日本政府のオープンデータに、AIアシスタントから直接アクセスできる [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) サーバーです。

Claude Desktop や Claude Code に接続するだけで、**統計・法令・気象・防災・企業情報・学術文献**など、中央省庁が公開している30以上のAPIを自然言語で検索・取得できます。

## できること

- **「東京都の人口推移を教えて」** → e-Stat / 統計ダッシュボードから統計データを取得
- **「渋谷区の災害リスクは？」** → 地震ハザード・浸水リスク・河川水位を一括評価
- **「AIに関する最新の学術論文を探して」** → NDL・J-STAGE・CiNii・ジャパンサーチを横断検索
- **「今日の東京の天気は？」** → 気象庁の天気予報・AMeDAS観測データを取得
- **「個人情報保護法の条文を見せて」** → 法令APIから法令本文を検索・表示
- **「トヨタ自動車の企業情報を調べて」** → 法人番号・gBizINFO・EDINET有価証券報告書を統合取得
- **「大気汚染の最新データは？」** → そらまめくん（環境省）からリアルタイムデータを取得

## 利用可能なデータ

| 分野 | データ内容 | 提供元 |
|------|-----------|--------|
| **統計** | 国勢調査、GDP、CPI、家計調査、約6,000系列の統計指標 | 総務省 e-Stat / 統計ダッシュボード |
| **気象・防災** | 天気予報、台風情報、AMeDAS、地震ハザード、浸水リスク、河川水位 | 気象庁 / 防災科研 / 国交省 |
| **法令** | 法令一覧・本文・キーワード検索 | デジタル庁 e-Gov |
| **企業・金融** | 法人番号、補助金・特許・財務、有価証券報告書 | 国税庁 / 経産省 / 金融庁 |
| **不動産** | 不動産取引価格、地価公示 | 国交省 |
| **学術・文化** | 書誌情報、学術論文、大学紀要、文化財・美術作品 | 国会図書館 / JST / NII |
| **医療** | 特定健診データ（BMI、血圧等） | 厚労省 NDB |
| **経済** | マネーストック、為替レート、金利 | 日本銀行 |
| **地理** | ジオコーディング、行政区域境界（GeoJSON） | 国土地理院 / NII |
| **環境・科学** | 大気汚染、地質図、衛星データ | 環境省 / 産総研 / JAXA |
| **行政** | 国会会議録、官公需情報、海外安全情報、パブリックコメント | 国会図書館 / 中小企業庁 / 外務省 |
| **求人** | ハローワーク求人情報 | 厚労省 |

**約50ツールはAPIキー不要** — インストール直後からすぐに使えます。

## セットアップ

### 1. インストール

```bash
git clone https://github.com/Agentic-govornance/japan-gov-mcp.git
cd japan-gov-mcp
npm install
npm run build
```

### 2. Claude Desktop に接続

`~/Library/Application Support/Claude/claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "japan-gov-mcp": {
      "command": "node",
      "args": ["/path/to/japan-gov-mcp/build/index.js"]
    }
  }
}
```

これだけで、APIキー不要の約50ツールが使えるようになります。

### 3. APIキーの追加（任意）

より多くのデータにアクセスしたい場合は、環境変数にAPIキーを追加できます。
すべて**無料**で取得可能です。詳細は [.env.example](./.env.example) を参照してください。

```json
{
  "mcpServers": {
    "japan-gov-mcp": {
      "command": "node",
      "args": ["/path/to/japan-gov-mcp/build/index.js"],
      "env": {
        "ESTAT_APP_ID": "your-key",
        "EDINET_API_KEY": "your-key"
      }
    }
  }
}
```

## ドキュメント

- [シナリオ複合ツール](./docs/SCENARIOS.md) — 複数APIを組み合わせた分析パターン
- [アーキテクチャ設計](./docs/ARCHITECTURE.md) — システム設計と拡張方法
- [APIカタログ](./docs/API_CATALOG.md) — 全API仕様一覧

## ライセンス

MIT

## 関連リンク

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/download)
- [政府統計の総合窓口 (e-Stat)](https://www.e-stat.go.jp/)
- [データカタログサイト (data.go.jp)](https://www.data.go.jp/)
