/**
 * merger.ts エッジケーステスト
 * - コード正規化（先頭0、6桁チェックディジット）
 * - 全合併データの整合性
 * - 年境界の厳密テスト（合併年ちょうどの扱い）
 * - 空配列・無効入力
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMergerInfo,
  checkMergerWarning,
  checkMergerWarnings,
  listMergers,
} from '../build/utils/merger.js';

describe('merger edge cases', () => {
  // === コード正規化 ===
  it('5桁コードでヒット', () => {
    const info = getMergerInfo('35211');
    assert.ok(info);
    assert.equal(info.name, '長門市');
  });

  it('6桁コード（末尾0）でヒット', () => {
    const info = getMergerInfo('352110');
    assert.ok(info);
    assert.equal(info.name, '長門市');
  });

  it('先頭0付き5桁コードでヒット', () => {
    const info = getMergerInfo('09213');
    assert.ok(info);
    assert.equal(info.name, '那須塩原市');
  });

  it('存在しないコードはnull', () => {
    assert.equal(getMergerInfo('99999'), null);
    assert.equal(getMergerInfo('00000'), null);
  });

  it('空文字はnull', () => {
    assert.equal(getMergerInfo(''), null);
  });

  // === 合併データ整合性 ===
  it('全合併データにcode/name/mergerDate/preMergerEntities/typeがある', () => {
    const all = listMergers();
    for (const m of all) {
      assert.ok(m.code, `codeが空: ${JSON.stringify(m)}`);
      assert.ok(m.name, `nameが空: ${m.code}`);
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(m.mergerDate), `mergerDate形式不正: ${m.code} = ${m.mergerDate}`);
      assert.ok(m.preMergerEntities.length >= 2, `${m.code}(${m.name}): 合併前エンティティが2未満`);
      assert.ok(['new', 'absorption'].includes(m.type), `${m.code}: type不正: ${m.type}`);
    }
  });

  it('全合併データのmergerDateが有効な日付', () => {
    const all = listMergers();
    for (const m of all) {
      const d = new Date(m.mergerDate);
      assert.ok(!isNaN(d.getTime()), `${m.code}: 無効な日付 ${m.mergerDate}`);
      const year = d.getFullYear();
      assert.ok(year >= 1950 && year <= 2015, `${m.code}: 合併年${year}は範囲外`);
    }
  });

  it('合併コードがユニーク', () => {
    const all = listMergers();
    const codes = all.map(m => m.code);
    const unique = new Set(codes);
    assert.equal(codes.length, unique.size, `重複コード: ${codes.filter((c, i) => codes.indexOf(c) !== i)}`);
  });

  // === 年境界の厳密テスト ===
  it('合併年ちょうどは「合併後」扱い', () => {
    // 長門市: 2005-03-22合併。2005年は合併後(after)
    const warn = checkMergerWarning('35211', [2004, 2005]);
    assert.ok(warn);
    assert.equal(warn.severity, 'HIGH');
    assert.ok(warn.affectedYears.before.includes(2004));
    assert.ok(warn.affectedYears.after.includes(2005));
  });

  it('合併前年のみ → 境界跨がないのでnull', () => {
    // 長門市: 2005合併。2000,2004は全て合併前
    const warn = checkMergerWarning('35211', [2000, 2004]);
    assert.equal(warn, null);
  });

  it('合併後年のみ → 境界跨がないのでnull', () => {
    const warn = checkMergerWarning('35211', [2005, 2010, 2015]);
    assert.equal(warn, null);
  });

  it('1年だけ → 跨がないのでnull', () => {
    const warn = checkMergerWarning('35211', [2020]);
    assert.equal(warn, null);
  });

  it('空の年リスト → MEDIUM（情報のみ）', () => {
    const warn = checkMergerWarning('35211', []);
    assert.ok(warn);
    assert.equal(warn.severity, 'MEDIUM');
  });

  // === checkMergerWarnings ===
  it('空コード配列は空結果', () => {
    const warnings = checkMergerWarnings([], [2000, 2020]);
    assert.equal(warnings.length, 0);
  });

  it('全合併なし自治体は空結果', () => {
    // 箱根町(14382), 草津町(10426) は合併なし
    const warnings = checkMergerWarnings(['14382', '10426'], [2000, 2020]);
    assert.equal(warnings.length, 0);
  });

  it('混合（合併あり+なし）で正確にフィルタ', () => {
    const warnings = checkMergerWarnings(
      ['35211', '14382', '44213', '10426'],
      [2000, 2010]
    );
    // 長門市(35211)と由布市(44213)のみ合併境界跨ぎ
    const codes = warnings.map(w => w.code);
    assert.ok(codes.includes('35211'), '長門市が含まれるべき');
    assert.ok(codes.includes('44213'), '由布市が含まれるべき');
    assert.ok(!codes.includes('14382'), '箱根町は含まれない');
    assert.ok(!codes.includes('10426'), '草津町は含まれない');
  });

  // === 個別自治体検証 ===
  it('由布市(44213): 2005-10-01合併、湯布院町含む', () => {
    const info = getMergerInfo('44213');
    assert.ok(info);
    assert.equal(info.mergerDate, '2005-10-01');
    assert.ok(info.preMergerEntities.some(e => e.name === '湯布院町'));
  });

  it('那須塩原市(09213): 2005-01-01合併、塩原町含む', () => {
    const info = getMergerInfo('09213');
    assert.ok(info);
    assert.ok(info.preMergerEntities.some(e => e.name === '塩原町'));
  });

  it('松江市(32201): 2005-03-31合併、玉湯町含む', () => {
    const info = getMergerInfo('32201');
    assert.ok(info);
    assert.ok(info.preMergerEntities.some(e => e.name === '玉湯町'));
  });

  it('指宿市(46210): 2006-01-01合併', () => {
    const info = getMergerInfo('46210');
    assert.ok(info);
    assert.equal(info.mergerDate, '2006-01-01');
  });

  it('加賀市(18207): 山中温泉の合併', () => {
    const info = getMergerInfo('18207');
    assert.ok(info);
    assert.ok(info.preMergerEntities.some(e => e.name === '山中町'));
  });
});
