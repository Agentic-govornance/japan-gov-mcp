# Task 003: キー不要API群一括検証

## 目的
APIキー不要で即テスト可能な5つのAPIの動作検証とレスポンス型定義。
これらはすぐに実行できるため、最初の検証に最適。

## 対象API

### 1. 統計ダッシュボード (総務省)
- Base: `https://dashboard.e-stat.go.jp/api/1.0/Json/`
- テストURL例: `https://dashboard.e-stat.go.jp/api/1.0/Json/getIndicatorInfo?Lang=JP&MetaGetFlg=Y`

### 2. 法令API (e-Gov)
- Base: `https://elaws.e-gov.go.jp/api/1/`
- テストURL例: `https://elaws.e-gov.go.jp/api/1/lawlists/2` (法律一覧)
- ⚠️ XMLレスポンス → JSON変換が必要
- `fast-xml-parser` を依存に追加: `npm install fast-xml-parser`

### 3. 不動産情報ライブラリ (国土交通省)
- Base: `https://www.reinfolib.mlit.go.jp/ex-api/external/`
- テストURL例: `https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?from=20231&to=20234&area=13`

### 4. データカタログ (デジタル庁/CKAN)
- Base: `https://www.data.go.jp/data/api/3/`
- テストURL例: `https://www.data.go.jp/data/api/3/action/package_search?q=人口&rows=5`

### 5. 海外安全情報 (外務省)
- テストURL例: `https://www.anzen.mofa.go.jp/od/allcountry.json`

## 出力ファイル
- `tests/noauth-apis.test.ts` — 全5APIの実行テスト
- `src/providers/misc.ts` — 必要に応じた修正

## テスト内容

```typescript
// tests/noauth-apis.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('キー不要API検証', () => {

  describe('統計ダッシュボード', () => {
    it('should fetch indicator info', async () => {
      const res = await fetch('https://dashboard.e-stat.go.jp/api/1.0/Json/getIndicatorInfo?Lang=JP&MetaGetFlg=Y');
      assert.strictEqual(res.ok, true);
      const data = await res.json();
      // レスポンス構造を記録
      console.error('Dashboard response keys:', Object.keys(data));
    });
  });

  describe('法令API', () => {
    it('should fetch law list as XML', async () => {
      const res = await fetch('https://elaws.e-gov.go.jp/api/1/lawlists/2');
      assert.strictEqual(res.ok, true);
      const text = await res.text();
      assert.ok(text.includes('<?xml'));
    });
  });

  describe('不動産情報ライブラリ', () => {
    it('should fetch transaction data', async () => {
      const res = await fetch('https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001?from=20231&to=20234&area=13');
      assert.strictEqual(res.ok, true);
    });
  });

  describe('データカタログ', () => {
    it('should search datasets', async () => {
      const res = await fetch('https://www.data.go.jp/data/api/3/action/package_search?q=人口&rows=3');
      assert.strictEqual(res.ok, true);
      const data = await res.json();
      assert.ok(data.success);
    });
  });

  describe('海外安全情報', () => {
    it('should fetch all country safety info', async () => {
      const res = await fetch('https://www.anzen.mofa.go.jp/od/allcountry.json');
      // ステータスコードとレスポンス構造を記録
      console.error('Safety info status:', res.status);
    });
  });
});
```

## 重要な作業
1. 各APIの実レスポンスを取得して構造を記録
2. レスポンス構造に基づいて TypeScript 型定義を作成
3. `src/providers/misc.ts` のURL・パラメータが正しいか検証
4. 法令APIのXML→JSON変換ロジックを実装

## 検証基準
- [ ] 5つのAPIすべてにHTTPリクエストが成功
- [ ] レスポンス構造の型定義が完成
- [ ] 法令APIのXML→JSON変換が動作
- [ ] misc.ts のエンドポイントURLが全て正確
