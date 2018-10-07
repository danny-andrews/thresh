import {parseJSON} from '../shared';
import ReaderPromise from '../shared/reader-promise';
import {ManifestFileReadErr} from '../core/errors';

import {readFile} from './base';

export default manifestFilepath => readFile(manifestFilepath)
  .mapErr(ManifestFileReadErr)
  .chain(
    contents => parseJSON(contents).cata(
      error => ManifestFileReadErr(error) |> ReaderPromise.fromError,
      ReaderPromise.of
    )
  );
