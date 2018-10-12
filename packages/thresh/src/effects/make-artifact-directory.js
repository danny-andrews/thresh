import {ArtifactDirectoryCreationErr} from '../core/errors';
import {OUTPUT_FILEPATH} from '../core/constants';

import {mkdir, resolve} from './base';

export default rootPath => resolve(rootPath, OUTPUT_FILEPATH)
  .chain(mkdir)
  .mapErr(ArtifactDirectoryCreationErr);
