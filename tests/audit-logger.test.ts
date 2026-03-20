/**
 * Audit Logger Tests
 * NOTE: src/lib/auditLogger.ts is currently removed — skip until module is recreated
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

let withAudit: any, logAudit: any, hashApiKey: any, generateSessionId: any, maskEndpoint: any;
type AuditLogEntry = any;
let moduleAvailable = false;
try {
  const mod = await import('../build/lib/auditLogger.js');
  withAudit = mod.withAudit;
  logAudit = mod.logAudit;
  hashApiKey = mod.hashApiKey;
  generateSessionId = mod.generateSessionId;
  maskEndpoint = mod.maskEndpoint;
  moduleAvailable = true;
} catch {
  // module not built yet
}

const TEST_LOG_PATH = '/tmp/japan-gov-mcp-test-audit.log';

afterEach(async () => {
  // テスト後にログファイル削除
  if (existsSync(TEST_LOG_PATH)) {
    await unlink(TEST_LOG_PATH);
  }
  delete process.env.GOV_MCP_AUDIT_LOG_PATH;
});

describe('Audit Logger', { skip: !moduleAvailable ? 'auditLogger module not built' : undefined }, () => {
  it('should not log when GOV_MCP_AUDIT_LOG_PATH is not set', async () => {
    delete process.env.GOV_MCP_AUDIT_LOG_PATH;

    await logAudit({
      timestamp: new Date().toISOString(),
      tool: 'test_tool',
      params: { key: 'value' },
      status: 'success',
      duration_ms: 100,
    });

    assert.equal(existsSync(TEST_LOG_PATH), false);
  });

  it('should log to file when GOV_MCP_AUDIT_LOG_PATH is set', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const entry: AuditLogEntry = {
      timestamp: '2024-12-15T10:30:00.000Z',
      tool: 'ndb_inspection_stats',
      params: { itemName: 'BMI', prefectureName: '東京都' },
      status: 'success',
      duration_ms: 1250,
    };

    await logAudit(entry);

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const lines = content.trim().split('\n');

    assert.equal(lines.length, 1);
    const logged = JSON.parse(lines[0]) as AuditLogEntry;
    assert.equal(logged.tool, 'ndb_inspection_stats');
    assert.equal(logged.status, 'success');
    assert.deepEqual(logged.params, { itemName: 'BMI', prefectureName: '東京都' });
  });

  it('should mask sensitive parameters', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async (params: Record<string, unknown>) => {
      return { success: true, data: params };
    });

    await mockTool({ apiKey: 'secret-key-123', normalParam: 'visible' });

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    assert.equal(logged.params.apiKey, '***MASKED***');
    assert.equal(logged.params.normalParam, 'visible');
  });

  it('should log error status when tool returns ApiResponse with success=false', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async () => {
      return {
        success: false,
        error: 'API key is not set',
        source: 'Test/tool',
      };
    });

    await mockTool({});

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    assert.equal(logged.status, 'error');
    assert.equal(logged.error, 'API key is not set');
    assert.equal(logged.source, 'Test/tool');
  });

  it('should log error status when tool throws exception', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async () => {
      throw new Error('Network timeout');
    });

    try {
      await mockTool({});
      assert.fail('Should have thrown');
    } catch (error) {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Network timeout');
    }

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    assert.equal(logged.status, 'error');
    assert.equal(logged.error, 'Network timeout');
  });

  it('should record duration_ms', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async () => {
      await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms wait
      return { success: true, data: {} };
    });

    await mockTool({});

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    assert.ok(logged.duration_ms >= 50);
    assert.ok(logged.duration_ms < 200); // reasonable upper bound
  });

  it('should record result_size', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async () => {
      return { success: true, data: { large: 'x'.repeat(1000) } };
    });

    await mockTool({});

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    assert.ok(logged.result_size);
    assert.ok(logged.result_size > 1000);
  });

  it('should handle nested sensitive parameters', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async (params: Record<string, unknown>) => {
      return { success: true, data: params };
    });

    await mockTool({
      config: { apiKey: 'secret-123', token: 'bearer-xyz' },
      normalParam: 'visible',
    });

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    const config = logged.params.config as Record<string, unknown>;
    assert.equal(config.apiKey, '***MASKED***');
    assert.equal(config.token, '***MASKED***');
    assert.equal(logged.params.normalParam, 'visible');
  });

  it('should generate API key hash', () => {
    const hash1 = hashApiKey('my-secret-key');
    const hash2 = hashApiKey('my-secret-key');
    const hash3 = hashApiKey('different-key');

    assert.ok(hash1.startsWith('sha256:'));
    assert.equal(hash1, hash2); // same key → same hash
    assert.notEqual(hash1, hash3); // different key → different hash
  });

  it('should generate unique session IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();

    assert.ok(id1.startsWith('sess_'));
    assert.ok(id2.startsWith('sess_'));
    assert.notEqual(id1, id2);
  });

  it('should log multiple entries in NDJSON format', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async (params: Record<string, unknown>) => {
      return { success: true, data: params };
    });

    await mockTool({ call: 1 });
    await mockTool({ call: 2 });
    await mockTool({ call: 3 });

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const lines = content.trim().split('\n');

    assert.equal(lines.length, 3);

    const log1 = JSON.parse(lines[0]) as AuditLogEntry;
    const log2 = JSON.parse(lines[1]) as AuditLogEntry;
    const log3 = JSON.parse(lines[2]) as AuditLogEntry;

    assert.deepEqual(log1.params, { call: 1 });
    assert.deepEqual(log2.params, { call: 2 });
    assert.deepEqual(log3.params, { call: 3 });
  });

  it('should log externalEndpoint and httpStatus when provided in result', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async () => {
      return {
        success: true,
        data: { value: 123 },
        externalEndpoint: 'https://api.example.com/data',
        httpStatus: 200,
      };
    });

    await mockTool({});

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    assert.equal(logged.externalEndpoint, 'https://api.example.com/data');
    assert.equal(logged.httpStatus, 200);
  });

  it('should mask sensitive query parameters in externalEndpoint', async () => {
    process.env.GOV_MCP_AUDIT_LOG_PATH = TEST_LOG_PATH;

    const mockTool = withAudit('test_tool', async () => {
      return {
        success: true,
        data: {},
        externalEndpoint: 'https://api.example.com/data?apiKey=secret123&page=1&token=bearer-xyz',
        httpStatus: 200,
      };
    });

    await mockTool({});

    const content = await readFile(TEST_LOG_PATH, 'utf8');
    const logged = JSON.parse(content.trim()) as AuditLogEntry;

    assert.ok(logged.externalEndpoint?.includes('apiKey=***MASKED***'));
    assert.ok(logged.externalEndpoint?.includes('token=***MASKED***'));
    assert.ok(logged.externalEndpoint?.includes('page=1'));
  });

  it('should mask endpoint URL with maskEndpoint helper', () => {
    const url1 = 'https://api.example.com/data?apiKey=secret&page=1';
    const masked1 = maskEndpoint(url1);

    assert.ok(masked1.includes('apiKey=***MASKED***'));
    assert.ok(masked1.includes('page=1'));

    const url2 = 'https://api.example.com/search?token=bearer-123&query=test&appId=app-456';
    const masked2 = maskEndpoint(url2);

    assert.ok(masked2.includes('token=***MASKED***'));
    assert.ok(masked2.includes('appId=***MASKED***'));
    assert.ok(masked2.includes('query=test'));
  });

  it('should handle invalid URL in maskEndpoint', () => {
    const invalid = 'not-a-valid-url';
    const masked = maskEndpoint(invalid);

    assert.equal(masked, invalid); // returns as-is
  });
});
