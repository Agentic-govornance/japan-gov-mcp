/**
 * ツール関連の型定義
 */

import type { HelloworkConfig } from '../providers/hellowork.js';
import type { RealEstateConfig } from '../providers/realestate.js';
import type { MlitDpfConfig } from '../providers/mlit-dpf.js';
import type { MsilConfig } from '../providers/msil.js';
import type { OdptConfig } from '../providers/odpt.js';

/** ツールカテゴリ */
export type ToolCategory = 'statistics' | 'law' | 'economy' | 'geospatial' | 'disaster' | 'labor' | 'academic' | 'science' | 'health' | 'government' | 'catalog' | 'deprecated';

/** ツールメタデータ */
export interface ToolMetadata {
  category: ToolCategory;
  tags: string[];
  exampleQueries: string[];
}

/** サーバー設定 */
export interface ServerConfig {
  estat:     { appId: string };
  resas:     { apiKey: string };
  houjin:    { appId: string };
  gbiz:      { token: string };
  edinet:    { apiKey: string };
  hellowork: HelloworkConfig;
  realestate: RealEstateConfig;
  mlitDpf:   MlitDpfConfig;
  msil:      MsilConfig;
  odpt:      OdptConfig;
}
