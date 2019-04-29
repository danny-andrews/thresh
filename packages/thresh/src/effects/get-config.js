import ReaderPromise from '@danny.andrews/reader-promise';
import {parseTOML} from '@danny.andrews/fp-utils';
import {camelizeKeys} from 'humps';
import R from 'ramda';

import {ConfigFileReadErr, ConfigFileParseErr} from '../core/errors';

import {readFile, getCommandLineArgs} from './base';

export default () => getCommandLineArgs()
  .map(R.prop('config-path'))
  .chain(readFile)
  .mapErr(ConfigFileReadErr)
  .chain(
    contents => parseTOML(contents).cata(
      () => ConfigFileParseErr() |> ReaderPromise.fromError,
      ReaderPromise.of
    )
  )
  .map(camelizeKeys);
