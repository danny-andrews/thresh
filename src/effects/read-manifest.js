import R from 'ramda';

import {parseJSON} from '../shared';
import {ManifestFileReadErr} from '../core/errors';

import {readFile} from './base';

export default manifestFilepath => readFile(manifestFilepath)
  .map(
    contents => parseJSON(contents).cata(
      error => error |> ManifestFileReadErr |> Promise.reject,
      R.identity
    )
  )
  .mapErr(ManifestFileReadErr);
