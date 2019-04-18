import ReaderPromise from '@danny.andrews/reader-promise';

import {FileSizeReadErr} from '../core/errors';

import {getFileStats} from './base';

export default filepaths => ReaderPromise.parallel(
  filepaths.map(
    filepath => getFileStats(filepath)
      .map(({size}) => ({filepath, size}))
      .mapErr(() => FileSizeReadErr(filepath))
  )
);
