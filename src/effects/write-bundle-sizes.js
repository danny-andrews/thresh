import {ErrorWritingBundleSizeArtifactErr} from '../core/errors';
import {serializeForFile} from '../shared';
import ReaderPromise from '../core/reader-promise';
import resolve from '../resolve';
import {BUNDLE_SIZES_FILENAME, OUTPUT_FILEPATH} from '../core/constants';

export default ({rootPath, projectName, bundleSizes}) =>
  resolve(
    rootPath,
    OUTPUT_FILEPATH,
    projectName,
    BUNDLE_SIZES_FILENAME
  ).chain(filepath =>
    ReaderPromise.fromReaderFn(({writeFile}) =>
      writeFile(
        filepath,
        serializeForFile(bundleSizes)
      ).catch(error => Promise.reject(ErrorWritingBundleSizeArtifactErr(error)))
    )
  );
