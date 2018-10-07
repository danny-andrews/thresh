import ReaderPromise from '@danny.andrews/reader-promise';
import {readFile} from '@danny.andrews/effects';
import {parseJSON} from '@danny.andrews/utils';

import {ManifestFileReadErr} from '../core/errors';

export default manifestFilepath => readFile(manifestFilepath)
  .mapErr(ManifestFileReadErr)
  .chain(
    contents => parseJSON(contents).cata(
      error => ManifestFileReadErr(error) |> ReaderPromise.fromError,
      ReaderPromise.of
    )
  );
