/**
 * プレースホルダツール登録（海しる・ODPT: APIキー登録待ち）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';
import * as msil from '../providers/msil.js';
import * as odpt from '../providers/odpt.js';

export const metadata: Record<string, ToolMetadata> = {
  msil_layers: { category: 'geospatial', tags: ['marine', 'ocean', 'gis', 'placeholder'], exampleQueries: ['海しる利用可能レイヤ一覧'] },
  msil_features: { category: 'geospatial', tags: ['marine', 'ocean', 'geojson', 'placeholder'], exampleQueries: ['海洋空間情報GeoJSON取得'] },
  odpt_railway_timetable: { category: 'geospatial', tags: ['transport', 'railway', 'timetable', 'placeholder'], exampleQueries: ['東京メトロ銀座線の時刻表'] },
  odpt_bus_timetable: { category: 'geospatial', tags: ['transport', 'bus', 'timetable', 'placeholder'], exampleQueries: ['都営バスの時刻表'] },
};

export function register(server: McpServer, config: ServerConfig) {
  server.tool('msil_layers',
    '【海しる/海上保安庁】利用可能レイヤ一覧取得（※APIキー登録必要・実装保留中）',
    {},
    async () => formatResponse(await msil.getLayers(config.msil))
  );

  server.tool('msil_features',
    '【海しる/海上保安庁】指定レイヤのGeoJSON取得（※APIキー登録必要・実装保留中）',
    {
      layerId: z.string().max(100).describe('レイヤID'),
      bbox: z.string().max(100).optional().describe('範囲指定 (lon1,lat1,lon2,lat2)'),
    },
    async (p) => formatResponse(await msil.getFeatures(p, config.msil))
  );

  server.tool('odpt_railway_timetable',
    '【ODPT/公共交通】鉄道時刻表取得（※APIキー登録必要・実装保留中）',
    {
      operator: z.string().max(200).optional().describe('事業者（例: "odpt.Operator:TokyoMetro"）'),
      railway: z.string().max(200).optional().describe('路線（例: "odpt.Railway:TokyoMetro.Ginza"）'),
      station: z.string().max(200).optional().describe('駅（例: "odpt.Station:TokyoMetro.Ginza.Shibuya"）'),
    },
    async (p) => formatResponse(await odpt.getRailwayTimetable(p, config.odpt))
  );

  server.tool('odpt_bus_timetable',
    '【ODPT/公共交通】バス時刻表取得（※APIキー登録必要・実装保留中）',
    {
      operator: z.string().max(200).optional().describe('バス事業者'),
      busroutePattern: z.string().max(200).optional().describe('バス系統'),
      busstopPole: z.string().max(200).optional().describe('バス停'),
    },
    async (p) => formatResponse(await odpt.getBusTimetable(p, config.odpt))
  );
}
