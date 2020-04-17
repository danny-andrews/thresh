import {serializeForFile} from '../shared';
import {AssetDiffsWriteErr} from '../core/errors';
import {TARGET_DIFFS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

import {resolve, writeFile} from './base';

export default ({rootPath, assetDiffs, thresholdFailures}) => resolve(
  rootPath,
  OUTPUT_FILEPATH,
  TARGET_DIFFS_FILENAME
).chain(
  filepath => writeFile(
    filepath,
    serializeForFile({diffs: assetDiffs, failures: thresholdFailures})
  )
).mapErr(AssetDiffsWriteErr);
