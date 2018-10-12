import ReaderPromise from '@danny.andrews/reader-promise';

import {AssetFileStatReadErr} from '../core/errors';

import {getFileStats} from './base';

export default stats => ReaderPromise.parallel(
  stats.map(
    ({path, ...rest}) => getFileStats(path)
      .map(({size}) => ({...rest, path, size}))
      .mapErr(() => AssetFileStatReadErr(path))
  )
);
