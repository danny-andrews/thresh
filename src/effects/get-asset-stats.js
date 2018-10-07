import ReaderPromise from 'reader-promise';

import {getFileStats} from './base';

export default stats => ReaderPromise.parallel(
  stats.map(
    stat => getFileStats(stat.path).map(({size}) => ({...stat, size}))
  )
);
