import {mkdir, resolve} from '@danny.andrews/effects';

import {ErrorCreatingArtifactDirectoryErr} from '../core/errors';
import {OUTPUT_FILEPATH} from '../core/constants';

export default rootPath => resolve(rootPath, OUTPUT_FILEPATH)
  .chain(mkdir)
  .mapErr(ErrorCreatingArtifactDirectoryErr);
