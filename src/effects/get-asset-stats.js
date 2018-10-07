import ReaderPromise from '@danny.andrews/reader-promise';
import {getFileStats} from '@danny.andrews/effects';

export default stats => ReaderPromise.parallel(
  stats.map(
    stat => getFileStats(stat.path).map(({size}) => ({...stat, size}))
  )
);
