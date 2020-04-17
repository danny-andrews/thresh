import {AssetStatsWriteErr} from '../core/errors';
import {serializeForFile} from '../shared';
import {TARGET_STATS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

import {resolve, writeFile} from './base';

export default (assetStats, rootPath) =>
  resolve(rootPath, OUTPUT_FILEPATH, TARGET_STATS_FILENAME)
    .chain(filepath => writeFile(filepath, serializeForFile(assetStats)))
    .mapErr(AssetStatsWriteErr);
