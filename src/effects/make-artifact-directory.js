import {ErrorCreatingArtifactDirectoryErr} from '../core/errors';
import ReaderPromise from '../core/reader-promise';

export default filepath =>
  ReaderPromise.fromReaderFn(({mkdir}) =>
    mkdir(filepath)
      .catch(error => Promise.reject(ErrorCreatingArtifactDirectoryErr(error)))
  );
