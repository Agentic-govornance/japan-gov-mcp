/**
 * MCP Server Smoke Test
 * サーバー起動 → tools/list で全97ツール登録を検証
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, cpSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const LOCAL_SERVER_DIR = '/tmp/japan-gov-mcp-test';

/**
 * Google Drive上で実行する場合、node_modulesのロードがETIMEDOUTになるため
 * ビルド成果物とnode_modulesを/tmpにコピーしてそこからサーバーを起動する
 */
function ensureLocalServer(): string {
  const localBuild = resolve(LOCAL_SERVER_DIR, 'build', 'index.js');
  if (existsSync(localBuild) && existsSync(resolve(LOCAL_SERVER_DIR, 'node_modules'))) {
    return localBuild;
  }
  // Fallback: use project directory directly
  return resolve(PROJECT_ROOT, 'build', 'index.js');
}

const SERVER_PATH = ensureLocalServer();

/** 改行区切りJSON-RPCメッセージ */
function rpcMessage(method: string, params: Record<string, unknown> = {}, id?: number): string {
  return JSON.stringify({ jsonrpc: '2.0', method, params, ...(id !== undefined ? { id } : {}) }) + '\n';
}

/** MCPサーバーを起動してtools/listを取得 */
async function getToolList(): Promise<{ name: string; description: string }[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let buffer = '';
    let phase = 0; // 0: waiting for init response, 1: waiting for tools/list response

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();

      // Parse newline-delimited JSON messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);

          if (phase === 0 && msg.id === 1) {
            // Initialize response → send initialized notification + tools/list
            phase = 1;
            child.stdin.write(rpcMessage('notifications/initialized'));
            child.stdin.write(rpcMessage('tools/list', {}, 2));
          } else if (phase === 1 && msg.id === 2) {
            // tools/list response
            child.kill();
            const tools = (msg.result?.tools || []).map((t: any) => ({
              name: t.name,
              description: t.description,
            }));
            resolve(tools);
            return;
          }
        } catch {
          // Ignore non-JSON lines
        }
      }
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (phase < 1) reject(new Error(`Server exited early with code ${code}`));
    });

    // Send initialize request
    child.stdin.write(rpcMessage('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'smoke-test', version: '1.0.0' },
    }, 1));

    // Timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Timeout waiting for MCP server response'));
    }, 10000);
  });
}

const EXPECTED_TOOLS = [
  'estat_search',
  'estat_meta',
  'estat_data',
  'estat_browse_indicators',
  'estat_check_availability',
  'estat_merger_check',
  'estat_compare_municipalities',
  'estat_time_series',
  'estat_correlation',
  'estat_session_init',
  'resas_prefectures',
  'resas_cities',
  'resas_population',
  'resas_population_pyramid',
  'resas_industry',
  'resas_tourism',
  'resas_finance',
  'resas_patents',
  'dashboard_indicators',
  'dashboard_data',
  'houjin_search',
  'gbiz_search',
  'gbiz_detail',
  'edinet_documents',
  'law_search',
  'law_data',
  'law_keyword_search',
  'realestate_transactions',
  'realestate_landprice',
  'mlit_dpf_search',
  'mlit_dpf_catalog',
  'opendata_search',
  'opendata_detail',
  'geospatial_search',
  'geospatial_dataset',
  'geospatial_organizations',
  'safety_overseas',
  'hellowork_search',
  'jma_forecast',
  'jma_overview',
  'jma_forecast_week',
  'jma_typhoon',
  'jshis_hazard',
  'amedas_stations',
  'amedas_data',
  'flood_depth',
  'river_level',
  'traffic_volume',
  'gsi_geocode',
  'gsi_reverse_geocode',
  'geoshape_city',
  'geoshape_pref',
  'ndl_search',
  'jstage_search',
  'cinii_search',
  'japansearch_search',
  'kokkai_speeches',
  'kokkai_meetings',
  'kkj_search',
  'soramame_air',
  'geology_legend',
  'geology_at_point',
  'jaxa_collections',
  'agriknowledge_search',
  'irdb_search',
  'researchmap_achievements',
  'plateau_datasets',
  'plateau_citygml',
  'pubcomment_list',
  'mirasapo_search',
  'mirasapo_detail',
  'mirasapo_categories',
  'mirasapo_regions',
  'jma_earthquake',
  'jma_tsunami',
  'ndb_inspection_stats',
  'ndb_items',
  'ndb_areas',
  'ndb_range_labels',
  'ndb_hub_proxy',
  'boj_timeseries',
  'boj_major_statistics',
  'msil_layers',
  'msil_features',
  'odpt_railway_timetable',
  'odpt_bus_timetable',
  'scenario_regional_health_economy',
  'scenario_labor_demand_supply',
  'scenario_corporate_intelligence',
  'scenario_disaster_risk_assessment',
  'scenario_academic_trend',
  'scenario_academic_trend_by_topics',
  'scenario_realestate_demographics',
  'scenario_regional_economy_full',
  'scenario_national_economy_summary',
  'gov_api_catalog',
  'gov_cross_search',
];

describe('MCP Server Smoke Test', () => {
  it('should start and register all 97 tools', async () => {
    const tools = await getToolList();
    const toolNames = tools.map(t => t.name).sort();

    assert.equal(tools.length, EXPECTED_TOOLS.length,
      `Expected ${EXPECTED_TOOLS.length} tools, got ${tools.length}. Tools: ${toolNames.join(', ')}`);

    for (const expected of EXPECTED_TOOLS) {
      assert.ok(toolNames.includes(expected), `Missing tool: ${expected}`);
    }
  });

  it('each tool should have a description', async () => {
    const tools = await getToolList();

    for (const tool of tools) {
      assert.ok(tool.description, `Tool ${tool.name} has no description`);
      assert.ok(tool.description.length > 5, `Tool ${tool.name} description too short: "${tool.description}"`);
    }
  });
});
