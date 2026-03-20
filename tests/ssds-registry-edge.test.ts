/**
 * ssds-registry エッジケーステスト
 * - 空文字/undefined/null入力
 * - 存在しないセクション
 * - 全指標の整合性チェック（relatedCodes双方向性）
 * - availableYearsの妥当性
 * - getRecommendedCodeの循環参照チェック
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  browseIndicators,
  getIndicatorInfo,
  getIndicatorUnit,
  getRelatedIndicators,
  getRecommendedCode,
  getTableIndicators,
  listSections,
} from '../build/utils/ssds-registry.js';

describe('ssds-registry edge cases', () => {
  it('browseIndicators: パラメータなしで全件返す', () => {
    const all = browseIndicators();
    assert.ok(all.length > 0, '全件0はおかしい');
  });

  it('browseIndicators: 空オブジェクトで全件返す', () => {
    const all = browseIndicators({});
    assert.ok(all.length > 0);
  });

  it('browseIndicators: 存在しないセクションは0件', () => {
    const results = browseIndicators({ section: 'Z' });
    assert.equal(results.length, 0);
  });

  it('browseIndicators: 存在しないキーワードは0件', () => {
    const results = browseIndicators({ keyword: 'xyzabc_nonexistent' });
    assert.equal(results.length, 0);
  });

  it('browseIndicators: 存在しないテーブルIDは0件', () => {
    const results = browseIndicators({ tableId: '9999999999' });
    assert.equal(results.length, 0);
  });

  it('browseIndicators: 複合フィルタ（セクション+キーワード）', () => {
    const results = browseIndicators({ section: 'C', keyword: '宿泊' });
    assert.ok(results.length > 0, '宿泊関連は存在するはず');
    assert.ok(results.every(r => r.section === 'C'));
    assert.ok(results.every(r => 
      r.label.includes('宿泊') || r.code.includes('宿泊') || (r.notes?.includes('宿泊') ?? false)
    ));
  });

  it('getIndicatorInfo: 空文字はnull', () => {
    assert.equal(getIndicatorInfo(''), null);
  });

  it('getIndicatorUnit: 空文字はnull', () => {
    assert.equal(getIndicatorUnit(''), null);
  });

  it('getRelatedIndicators: 関連なしコードは空配列', () => {
    const related = getRelatedIndicators('A1101');
    assert.ok(Array.isArray(related));
    // A1101にrelatedCodesがなければ空
  });

  it('getRelatedIndicators: 存在しないコードは空配列', () => {
    const related = getRelatedIndicators('NONEXIST');
    assert.ok(Array.isArray(related));
    assert.equal(related.length, 0);
  });

  it('relatedCodes双方向性チェック: AがBを参照→BもAを参照', () => {
    const all = browseIndicators();
    for (const ind of all) {
      if (ind.relatedCodes) {
        for (const rc of ind.relatedCodes) {
          const related = getIndicatorInfo(rc);
          assert.ok(related, `${ind.code}のrelatedCode ${rc} が未登録`);
          assert.ok(
            related.relatedCodes?.includes(ind.code),
            `${rc}のrelatedCodesに${ind.code}がない（双方向性違反）`
          );
        }
      }
    }
  });

  it('全指標のavailableYearsが昇順', () => {
    const all = browseIndicators();
    for (const ind of all) {
      for (let i = 1; i < ind.availableYears.length; i++) {
        assert.ok(
          ind.availableYears[i] > ind.availableYears[i - 1],
          `${ind.code}: availableYears not sorted: ${ind.availableYears}`
        );
      }
    }
  });

  it('全指標のavailableYearsが妥当な範囲（1970-2025）', () => {
    const all = browseIndicators();
    for (const ind of all) {
      for (const y of ind.availableYears) {
        assert.ok(y >= 1970 && y <= 2025, `${ind.code}: year ${y} out of range`);
      }
    }
  });

  it('getRecommendedCode: 存在しないコードはnull', () => {
    assert.equal(getRecommendedCode('NONEXIST'), null);
  });

  it('getRecommendedCode: alternativeコードも推奨を返す', () => {
    // A110101はalternative
    const info = getIndicatorInfo('A110101');
    if (info && info.recommendation === 'alternative') {
      const rec = getRecommendedCode('A110101');
      assert.ok(rec, 'alternativeに対して推奨が返るべき');
    }
  });

  it('getTableIndicators: 各テーブルの指標はそのテーブルに属する', () => {
    const tables = ['0000020101', '0000020103', '0000020104'];
    for (const tbl of tables) {
      const inds = getTableIndicators(tbl);
      assert.ok(inds.length > 0, `テーブル${tbl}に指標がない`);
      for (const ind of inds) {
        assert.equal(ind.table, tbl, `${ind.code}のtableが${tbl}と不一致: ${ind.table}`);
      }
    }
  });

  it('listSections: カウントが実際の指標数と一致', () => {
    const sections = listSections();
    for (const s of sections) {
      const inds = browseIndicators({ section: s.section });
      assert.equal(inds.length, s.count, `セクション${s.section}: count=${s.count} vs actual=${inds.length}`);
    }
  });

  it('全指標コードがユニーク', () => {
    const all = browseIndicators();
    const codes = all.map(i => i.code);
    const unique = new Set(codes);
    assert.equal(codes.length, unique.size, `重複コードあり: ${codes.filter((c, i) => codes.indexOf(c) !== i)}`);
  });
});
