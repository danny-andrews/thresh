import {TargetStatsWriteErr} from '../core/errors';
import {serializeForFile} from '../shared';
import {TARGET_STATS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

import {resolve, writeFile} from './base';

export default (targetStats, rootPath) =>
  resolve(rootPath, OUTPUT_FILEPATH, TARGET_STATS_FILENAME)
    .chain(filepath => writeFile(filepath, serializeForFile(targetStats)))
    .mapErr(TargetStatsWriteErr);
