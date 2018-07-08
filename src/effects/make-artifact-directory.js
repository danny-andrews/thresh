import {ErrorCreatingArtifactDirectoryErr} from '../core/errors';
import ReaderPromise from '../shared/reader-promise';
import resolve from '../resolve';
import {OUTPUT_FILEPATH} from '../core/constants';

export default ({rootPath}) =>
  resolve(rootPath, OUTPUT_FILEPATH).chain(filepath =>
    ReaderPromise.fromReaderFn(({mkdir}) =>
      mkdir(filepath).catch(
        error => Promise.reject(ErrorCreatingArtifactDirectoryErr(error))
      )
    )
  );
