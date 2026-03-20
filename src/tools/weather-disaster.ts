/**
 * 気象・防災 ツール登録
 * jma_forecast, jma_overview, jma_forecast_week, jma_typhoon,
 * jshis_hazard, amedas_stations, amedas_data, jma_earthquake,
 * jma_tsunami, flood_depth, river_level, traffic_volume
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ServerConfig, ToolMetadata } from './types.js';
import { formatResponse } from './helpers.js';
import {
  getForecast, getForecastOverview, getSeismicHazard,
  getAmedasStations, getAmedasData, getForecastWeekly, getTyphoonInfo,
  getEarthquakeList, getTsunamiList,
} from '../providers/weather.js';
import * as disaster from '../providers/disaster.js';

export const metadata: Record<string, ToolMetadata> = {
  jma_forecast: { category: 'disaster', tags: ['weather', 'forecast'], exampleQueries: ['東京都の天気予報', '地域コード130000の気象情報'] },
  jma_overview: { category: 'disaster', tags: ['weather', 'overview'], exampleQueries: ['東京都の天気概況文', '気象庁の天気解説'] },
  jma_forecast_week: { category: 'disaster', tags: ['weather', 'forecast', 'weekly'], exampleQueries: ['東京都の週間天気予報', '1週間先までの気象予測'] },
  jma_typhoon: { category: 'disaster', tags: ['weather', 'typhoon', 'disaster'], exampleQueries: ['現在接近中の台風情報', '台風進路予測'] },
  jshis_hazard: { category: 'disaster', tags: ['earthquake', 'hazard', 'risk'], exampleQueries: ['東京駅周辺の地震ハザード情報', '緯度経度から震度予測'] },
  amedas_stations: { category: 'disaster', tags: ['weather', 'observation', 'station'], exampleQueries: ['AMeDAS観測所一覧', '気象観測地点マスター'] },
  amedas_data: { category: 'disaster', tags: ['weather', 'observation', 'real-time'], exampleQueries: ['東京の現在気温・降水量', '観測所44132のリアルタイムデータ'] },
  jma_earthquake: { category: 'disaster', tags: ['earthquake', 'seismic', 'real-time'], exampleQueries: ['最近の地震情報一覧', '地震速報リスト取得'] },
  jma_tsunami: { category: 'disaster', tags: ['tsunami', 'warning', 'real-time'], exampleQueries: ['津波情報・警報一覧', '現在の津波注意報'] },
  flood_depth: { category: 'disaster', tags: ['flood', 'hazard', 'inundation'], exampleQueries: ['東京都の浸水想定深さ', '緯度経度の洪水リスク'] },
  river_level: { category: 'disaster', tags: ['river', 'flood', 'real-time'], exampleQueries: ['利根川の現在水位', 'リアルタイム河川水位情報'] },
  traffic_volume: { category: 'geospatial', tags: ['traffic', 'transport', 'jartic'], exampleQueries: ['首都高速の交通量データ', '道路交通量WFS情報'] },
};

export function register(server: McpServer, _config: ServerConfig) {
  server.tool('jma_forecast',
    '【気象庁】天気予報取得（APIキー不要）',
    { areaCode: z.string().max(10).describe('地域コード 6桁（例: 130000=東京）') },
    async (p) => formatResponse(await getForecast(p))
  );

  server.tool('jma_overview',
    '【気象庁】天気概況取得（APIキー不要）',
    { areaCode: z.string().max(10).describe('地域コード 6桁（例: 130000=東京）') },
    async (p) => formatResponse(await getForecastOverview(p))
  );

  server.tool('jma_forecast_week',
    '【気象庁】週間天気予報（7日間）取得',
    { areaCode: z.string().max(10).describe('地域コード 6桁（例: 130000=東京）') },
    async (p) => formatResponse(await getForecastWeekly(p))
  );

  server.tool('jma_typhoon',
    '【気象庁】現在の台風情報・進路予報取得',
    {},
    async () => formatResponse(await getTyphoonInfo())
  );

  server.tool('jshis_hazard',
    '【防災科研】地震ハザード情報取得（APIキー不要）',
    {
      lat: z.number().min(-90).max(90).describe('緯度 -90〜90'),
      lon: z.number().min(-180).max(180).describe('経度 -180〜180'),
    },
    async (p) => formatResponse(await getSeismicHazard(p))
  );

  server.tool('amedas_stations',
    '【気象庁】アメダス全観測所一覧',
    {},
    async () => formatResponse(await getAmedasStations())
  );

  server.tool('amedas_data',
    '【気象庁】アメダス観測データ取得',
    {
      pointId: z.string().max(20).describe('観測所ID'),
      date: z.string().max(12).optional().describe('観測時刻 YYYYMMDDHH（省略時は最新）'),
    },
    async (p) => formatResponse(await getAmedasData(p))
  );

  server.tool('jma_earthquake',
    '【気象庁】最近の地震情報一覧取得（APIキー不要）',
    {},
    async () => formatResponse(await getEarthquakeList())
  );

  server.tool('jma_tsunami',
    '【気象庁】津波情報・警報一覧取得（APIキー不要）',
    {},
    async () => formatResponse(await getTsunamiList())
  );

  server.tool('flood_depth',
    '【浸水ナビ/国土地理院】指定座標の洪水浸水想定深さ・ハザード情報取得',
    {
      lat: z.number().min(20).max(46).describe('緯度 24〜46'),
      lon: z.number().min(122).max(154).describe('経度 122〜154'),
      groupType: z.number().int().min(0).max(1).optional().describe('0=国管理（デフォルト） / 1=県管理'),
    },
    async (p) => formatResponse(await disaster.getFloodDepth(p))
  );

  server.tool('river_level',
    '【河川水位】リアルタイム河川水位情報取得',
    {
      stationId: z.string().max(30).describe('観測所ID'),
    },
    async (p) => formatResponse(await disaster.getRiverLevel(p))
  );

  server.tool('traffic_volume',
    '【国交省/JARTIC】指定地点周辺の道路交通量データ取得',
    {
      lat: z.number().min(-90).max(90).describe('緯度 -90〜90'),
      lon: z.number().min(-180).max(180).describe('経度 -180〜180'),
      radius: z.number().int().min(100).max(50000).optional().describe('検索半径（m、デフォルト1000）'),
      count: z.number().int().min(1).max(100).optional().describe('取得件数（デフォルト10）'),
    },
    async (p) => formatResponse(await disaster.getTrafficVolume(p))
  );
}
