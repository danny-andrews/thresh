import {ErrorCreatingArtifactDirectoryErr} from '../core/errors';
import {OUTPUT_FILEPATH} from '../core/constants';

import {mkdir, resolve} from './base';

export default rootPath => resolve(rootPath, OUTPUT_FILEPATH)
  .chain(filepath => mkdir(filepath))
  .mapErr(ErrorCreatingArtifactDirectoryErr);
