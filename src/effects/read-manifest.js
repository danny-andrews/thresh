import R from 'ramda';
import {parseJSON} from '../shared';
import {ManifestFileReadErr} from '../core/errors';
import ReaderPromise from '../core/reader-promise';

export default manifestFilepath =>
  ReaderPromise.fromReaderFn(({readFile}) =>
    readFile(manifestFilepath)
      .catch(error =>
        Promise.reject(ManifestFileReadErr(error))
      )
      .then(contents =>
        parseJSON(contents).cata(
          error => Promise.reject(ManifestFileReadErr(error)),
          R.identity
        )
      )
  );
