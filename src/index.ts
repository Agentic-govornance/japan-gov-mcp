#!/usr/bin/env node

/**
 * japan-gov-mcp — 日本政府API統合MCPサーバー
 *
 * 30+ API / 97 ツール（シナリオ複合ツール9個含む）
 * 13ドメインモジュールに分割されたツール登録
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { ServerConfig } from './tools/types.js';
import { TOOL_METADATA } from './tools/metadata.js';

// ── Domain tool modules ──
import { register as registerStatistics } from './tools/statistics.js';
import { register as registerResas } from './tools/resas.js';
import { register as registerCorporate } from './tools/corporate.js';
import { register as registerLaw } from './tools/law.js';
import { register as registerRealestate } from './tools/realestate.js';
import { register as registerOpendataGeo } from './tools/opendata-geo.js';
import { register as registerWeatherDisaster } from './tools/weather-disaster.js';
import { register as registerAcademic } from './tools/academic.js';
import { register as registerUrban } from './tools/urban.js';
import { register as registerHealthFinance } from './tools/health-finance.js';
import { register as registerPlaceholder } from './tools/placeholder.js';
import { register as registerScenarios } from './tools/scenarios.js';
import { register as registerIntegration } from './tools/integration.js';

// ── Config ──
const C: ServerConfig = {
  estat:      { appId: process.env.ESTAT_APP_ID || '' },
  resas:      { apiKey: process.env.RESAS_API_KEY || '' },
  houjin:     { appId: process.env.HOUJIN_APP_ID || '' },
  gbiz:       { token: process.env.GBIZ_TOKEN || '' },
  edinet:     { apiKey: process.env.EDINET_API_KEY || '' },
  hellowork:  { apiKey: process.env.HELLOWORK_API_KEY || '' },
  realestate: { apiKey: process.env.REALESTATE_API_KEY || '' },
  mlitDpf:    { apiKey: process.env.MLIT_DPF_API_KEY || '' },
  msil:       { apiKey: process.env.MSIL_API_KEY || '' },
  odpt:       { apiKey: process.env.ODPT_API_KEY || '' },
};

// ── Server ──
const server = new McpServer({ name: 'japan-gov-mcp', version: '1.0.0' });

// ── Register all 97 tools ──
registerStatistics(server, C);
registerResas(server, C);
registerCorporate(server, C);
registerLaw(server, C);
registerRealestate(server, C);
registerOpendataGeo(server, C);
registerWeatherDisaster(server, C);
registerAcademic(server, C);
registerUrban(server, C);
registerHealthFinance(server, C);
registerPlaceholder(server, C);
registerScenarios(server, C);
registerIntegration(server, C, TOOL_METADATA);

// ── Process error handlers ──
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// ── Start ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('japan-gov-mcp started');
  console.error(`APIs: e-Stat=${!!C.estat.appId} RESAS=${!!C.resas.apiKey} 法人=${!!C.houjin.appId} gBiz=${!!C.gbiz.token} EDINET=${!!C.edinet.apiKey}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
