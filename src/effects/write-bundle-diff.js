import {serializeForFile} from '../shared';
import {ErrorWritingBundleDiffArtifactErr} from '../core/errors';
import ReaderPromise from '../core/reader-promise';
import resolve from '../resolve';
import {BUNDLE_SIZES_DIFF_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

export default ({rootPath, projectName, bundleDiffs, thresholdFailures}) =>
  resolve(
    rootPath,
    OUTPUT_FILEPATH,
    projectName,
    BUNDLE_SIZES_DIFF_FILENAME
  ).chain(filepath =>
    ReaderPromise.fromReaderFn(({writeFile}) =>
      writeFile(
        filepath,
        serializeForFile({diffs: bundleDiffs, failures: thresholdFailures})
      ).catch(error => Promise.reject(ErrorWritingBundleDiffArtifactErr(error)))
    )
  );
