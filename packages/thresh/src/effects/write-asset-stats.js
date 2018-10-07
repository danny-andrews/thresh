import {ErrorWritingAssetSizesArtifactErr} from '../core/errors';
import {serializeForFile} from '../shared';
import {ASSET_STATS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

import {resolve, writeFile} from './base';

export default (assetStats, rootPath) =>
  resolve(rootPath, OUTPUT_FILEPATH, ASSET_STATS_FILENAME)
    .chain(filepath => writeFile(filepath, serializeForFile(assetStats)))
    .mapErr(ErrorWritingAssetSizesArtifactErr);
