import {serializeForFile} from '../shared';
import {TargetDiffsWriteErr} from '../core/errors';
import {TARGET_DIFFS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

import {resolve, writeFile} from './base';

export default ({rootPath, targetDiffs, thresholdFailures}) => resolve(
  rootPath,
  OUTPUT_FILEPATH,
  TARGET_DIFFS_FILENAME
).chain(
  filepath => writeFile(
    filepath,
    serializeForFile({diffs: targetDiffs, failures: thresholdFailures})
  )
).mapErr(TargetDiffsWriteErr);
