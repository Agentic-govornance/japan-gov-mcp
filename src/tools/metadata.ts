/**
 * 全ツールメタデータ集約
 */

import type { ToolMetadata } from './types.js';
import { metadata as statisticsMeta } from './statistics.js';
import { metadata as resasMeta } from './resas.js';
import { metadata as corporateMeta } from './corporate.js';
import { metadata as lawMeta } from './law.js';
import { metadata as realestateMeta } from './realestate.js';
import { metadata as opendataGeoMeta } from './opendata-geo.js';
import { metadata as weatherDisasterMeta } from './weather-disaster.js';
import { metadata as academicMeta } from './academic.js';
import { metadata as urbanMeta } from './urban.js';
import { metadata as healthFinanceMeta } from './health-finance.js';
import { metadata as placeholderMeta } from './placeholder.js';
import { metadata as scenariosMeta } from './scenarios.js';
import { metadata as integrationMeta } from './integration.js';

/** 全97ツールのメタデータ */
export const TOOL_METADATA: Record<string, ToolMetadata> = {
  ...statisticsMeta,
  ...resasMeta,
  ...corporateMeta,
  ...lawMeta,
  ...realestateMeta,
  ...opendataGeoMeta,
  ...weatherDisasterMeta,
  ...academicMeta,
  ...urbanMeta,
  ...healthFinanceMeta,
  ...placeholderMeta,
  ...scenariosMeta,
  ...integrationMeta,
};
