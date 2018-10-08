import ReaderPromise from '@danny.andrews/reader-promise';
import {parseTOML} from '@danny.andrews/fp-utils';

import {ConfigFileReadErr} from '../core/errors';

import {readFile} from './base';

export default configFilepath => readFile(configFilepath)
  .mapErr(ConfigFileReadErr)
  .chain(
    contents => parseTOML(contents).cata(
      error => ConfigFileReadErr(error) |> ReaderPromise.fromError,
      ReaderPromise.of
    )
  );
