/**
 * gov_cross_search 横断検索テスト
 * MCPサーバーを起動し、tools/callで横断検索を実行して検証
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_SERVER_DIR = '/tmp/japan-gov-mcp-test';

function ensureLocalServer(): string {
  const localBuild = resolve(LOCAL_SERVER_DIR, 'build', 'index.js');
  if (existsSync(localBuild) && existsSync(resolve(LOCAL_SERVER_DIR, 'node_modules'))) {
    return localBuild;
  }
  return resolve(__dirname, '..', 'build', 'index.js');
}

const SERVER_PATH = ensureLocalServer();

function rpcMessage(method: string, params: Record<string, unknown> = {}, id?: number): string {
  return JSON.stringify({ jsonrpc: '2.0', method, params, ...(id !== undefined ? { id } : {}) }) + '\n';
}

/** MCPサーバーを起動してtools/callを実行 */
async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let buffer = '';
    let phase = 0;

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (phase === 0 && msg.id === 1) {
            phase = 1;
            child.stdin.write(rpcMessage('notifications/initialized'));
            child.stdin.write(rpcMessage('tools/call', { name, arguments: args }, 2));
          } else if (phase === 1 && msg.id === 2) {
            child.kill();
            const text = msg.result?.content?.[0]?.text || '';
            resolve(text);
            return;
          }
        } catch { /* ignore non-JSON */ }
      }
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (phase < 1) reject(new Error(`Server exited early with code ${code}`));
    });

    child.stdin.write(rpcMessage('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'cross-search-test', version: '1.0.0' },
    }, 1));

    setTimeout(() => { child.kill(); reject(new Error('Timeout')); }, 15000);
  });
}

describe('gov_cross_search', () => {
  it('should return formatted response with scope all', async () => {
    const text = await callTool('gov_cross_search', { query: 'テスト' });
    assert.ok(text.includes('横断検索: "テスト"'), 'should include query in header');
    assert.ok(text.includes('スコープ: all'), 'should show scope');
    assert.ok(text.includes('取得時刻:'), 'should include timestamp');
  });

  it('should handle empty scope by falling back to all', async () => {
    const text = await callTool('gov_cross_search', { query: 'テスト', scope: [] });
    assert.ok(text.includes('スコープ: all'), 'empty scope should fallback to all');
  });

  it('should show skipped APIs when keys are missing', async () => {
    // APIキーが未設定の場合、skippedセクションが表示される
    const text = await callTool('gov_cross_search', { query: 'テスト', scope: ['corporate'] });
    // At least one of houjin/gbiz should be skipped (unless keys happen to be set)
    if (!process.env.HOUJIN_APP_ID && !process.env.GBIZ_TOKEN) {
      assert.ok(text.includes('スキップ'), 'should show skipped section when no API keys');
    }
  });

  it('should handle regional scope', async () => {
    const text = await callTool('gov_cross_search', { query: '人口', scope: ['regional'] });
    assert.ok(text.includes('スコープ: regional'), 'should show regional scope');
    // 統計ダッシュボードはAPIキー不要なのでresultsかerrorsのどちらかに出る
    assert.ok(
      text.includes('統計ダッシュボード') || text.includes('検索結果') || text.includes('エラー'),
      'should attempt dashboard API'
    );
  });

  it('should handle statistics scope', async () => {
    const text = await callTool('gov_cross_search', { query: 'GDP', scope: ['statistics'] });
    assert.ok(text.includes('スコープ: statistics'), 'should show statistics scope');
  });

  it('should handle legal scope', async () => {
    const text = await callTool('gov_cross_search', { query: '個人情報', scope: ['legal'] });
    assert.ok(text.includes('スコープ: legal'), 'should show legal scope');
    assert.ok(
      text.includes('法令検索') || text.includes('検索結果') || text.includes('エラー'),
      'should attempt legal API'
    );
  });
});
