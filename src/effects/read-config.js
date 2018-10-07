import ReaderPromise from '@danny.andrews/reader-promise';
import {readFile} from '@danny.andrews/effects';
import {parseTOML} from '@danny.andrews/utils';

import {ConfigFileReadErr} from '../core/errors';

export default configFilepath => readFile(configFilepath)
  .mapErr(ConfigFileReadErr)
  .chain(
    contents => parseTOML(contents).cata(
      error => ConfigFileReadErr(error) |> ReaderPromise.fromError,
      ReaderPromise.of
    )
  );
