import {ErrorWritingBundleSizeArtifactErr} from '../core/errors';
import {serializeForFile} from '../shared';
import ReaderPromise from '../core/reader-promise';

export default ({filepath, bundleSizes}) =>
  ReaderPromise.fromReaderFn(({writeFile}) =>
    writeFile(
      filepath,
      serializeForFile(bundleSizes)
    ).catch(error => Promise.reject(ErrorWritingBundleSizeArtifactErr(error)))
  );
