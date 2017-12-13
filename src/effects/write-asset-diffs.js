import {serializeForFile} from '../shared';
import {ErrorWritingAssetDiffsArtifactErr} from '../core/errors';
import ReaderPromise from '../core/reader-promise';
import resolve from '../resolve';
import {ASSET_DIFFS_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

export default ({rootPath, assetDiffs, thresholdFailures}) =>
  resolve(rootPath, OUTPUT_FILEPATH, ASSET_DIFFS_FILENAME).chain(filepath =>
    ReaderPromise.fromReaderFn(({writeFile}) =>
      writeFile(
        filepath,
        serializeForFile({diffs: assetDiffs, failures: thresholdFailures})
      ).catch(error => Promise.reject(ErrorWritingAssetDiffsArtifactErr(error)))
    )
  );
