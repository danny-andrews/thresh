import {serializeForFile} from '../shared';
import {ErrorWritingAssetDiffsArtifactErr} from '../core/errors';
import {ASSET_DIFFS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

import {resolve, writeFile} from './base';

export default ({rootPath, assetDiffs, thresholdFailures}) => resolve(
  rootPath,
  OUTPUT_FILEPATH,
  ASSET_DIFFS_FILENAME
)
  .chain(filepath => writeFile(
    filepath,
    serializeForFile({
      diffs: assetDiffs,
      failures: thresholdFailures
    })
  ))
  .mapErr(ErrorWritingAssetDiffsArtifactErr);
