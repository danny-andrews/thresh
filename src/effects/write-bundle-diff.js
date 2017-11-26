import {serializeForFile} from '../shared';
import {ErrorWritingBundleDiffArtifactErr} from '../core/errors';
import ReaderPromise from '../core/reader-promise';

export default ({filepath, bundleDiffs, thresholdFailures}) =>
  ReaderPromise.fromReaderFn(({writeFile}) =>
    writeFile(
      filepath,
      serializeForFile({diffs: bundleDiffs, failures: thresholdFailures})
    ).catch(error => Promise.reject(ErrorWritingBundleDiffArtifactErr(error)))
  );
