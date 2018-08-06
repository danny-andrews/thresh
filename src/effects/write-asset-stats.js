import {ErrorWritingAssetSizesArtifactErr} from '../core/errors';
import {serializeForFile} from '../shared';
import {resolve, writeFile} from './base';
import {ASSET_STATS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

export default ({rootPath, assetStats}) =>
  resolve(rootPath, OUTPUT_FILEPATH, ASSET_STATS_FILENAME)
    .chain(filepath => writeFile(filepath, serializeForFile(assetStats)))
    .mapErr(ErrorWritingAssetSizesArtifactErr);
