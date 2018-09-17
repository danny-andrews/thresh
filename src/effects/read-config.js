import R from 'ramda';

import {parseTOML} from '../shared';
import {ConfigFileReadErr} from '../core/errors';

import {readFile} from './base';

export default configFilepath => readFile(configFilepath)
  .map(
    contents => parseTOML(contents).cata(
      error => error |> ConfigFileReadErr |> Promise.reject,
      R.identity
    )
  )
  .mapErr(ConfigFileReadErr);
