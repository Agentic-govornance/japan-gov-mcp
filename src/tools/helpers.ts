/**
 * ツールハンドラ共通ヘルパー
 */

import type { ApiResponse } from '../utils/http.js';

/** 環境変数が未設定のときの警告メッセージ。空文字ならOK */
export function need(name: string, val: string) {
  return val ? '' : `⚠️ ${name} が未設定です。環境変数を確認してください。`;
}

/** JSON整形 */
export function json(o: any) { return JSON.stringify(o, null, 2); }

/** MCPテキストレスポンス生成 */
export function txt(s: string) { return { content: [{ type: 'text' as const, text: s }] }; }

/** ApiResponseを整形してMCPレスポンスに変換 */
export function formatResponse(res: ApiResponse): { content: { type: 'text'; text: string }[]; isError?: boolean } {
  if (!res.success) {
    return { content: [{ type: 'text' as const, text: `❌ エラー [${res.source}]\n${res.error}\n\n取得時刻: ${res.timestamp}` }], isError: true };
  }

  const parts: string[] = [`✅ ${res.source}`];

  // データ品質メタデータを表示
  if (res.meta) {
    const metaParts: string[] = [];
    if (res.meta.surveyName) metaParts.push(`調査: ${res.meta.surveyName}`);
    if (res.meta.surveyYear) metaParts.push(`調査年: ${res.meta.surveyYear}`);
    if (res.meta.units && Object.keys(res.meta.units).length > 0) {
      const unitStr = Object.entries(res.meta.units).map(([k, v]) => `${k}=${v}`).join(', ');
      metaParts.push(`単位: ${unitStr}`);
    }
    if (res.meta.suppressed && res.meta.suppressed.length > 0) {
      metaParts.push(`⚠️秘匿: ${res.meta.suppressed.join(', ')}`);
    }
    if (metaParts.length > 0) {
      parts.push(`📊 ${metaParts.join(' | ')}`);
    }
    if (res.meta.mergerWarnings && res.meta.mergerWarnings.length > 0) {
      for (const w of res.meta.mergerWarnings) {
        parts.push(`⚠️合併: ${w.name}(${w.code}) — ${w.message}`);
      }
    }
    if (res.meta.notes && res.meta.notes.length > 0) {
      parts.push(`📝 ${res.meta.notes.join('; ')}`);
    }
  }

  if (res.cached) parts.push('(キャッシュ)');
  parts.push('');
  parts.push(json(res.data));
  parts.push(`\n取得時刻: ${res.timestamp}`);

  return txt(parts.join('\n'));
}
