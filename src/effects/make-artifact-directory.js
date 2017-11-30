import {ErrorCreatingArtifactDirectoryErr} from '../core/errors';
import ReaderPromise from '../core/reader-promise';
import resolve from '../resolve';
import {OUTPUT_FILEPATH} from '../core/constants';

export default ({rootPath, projectName}) =>
  resolve(
    rootPath,
    OUTPUT_FILEPATH,
    projectName
  ).chain(filepath =>
    ReaderPromise.fromReaderFn(({mkdir}) =>
      mkdir(filepath).catch(
        error => Promise.reject(ErrorCreatingArtifactDirectoryErr(error))
      )
    )
  );
