import {ErrorWritingAssetSizesArtifactErr} from '../core/errors';
import {serializeForFile} from '../shared';
import ReaderPromise from '../core/reader-promise';
import resolve from '../resolve';
import {ASSET_STATS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

export default ({rootPath, projectName, assetStats}) =>
  resolve(
    rootPath,
    OUTPUT_FILEPATH,
    projectName,
    ASSET_STATS_FILENAME
  ).chain(filepath =>
    ReaderPromise.fromReaderFn(({writeFile}) =>
      writeFile(filepath, serializeForFile(assetStats))
        .catch(error =>
          Promise.reject(ErrorWritingAssetSizesArtifactErr(error))
        )
    )
  );
