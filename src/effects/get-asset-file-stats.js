import ReaderPromise from '../core/reader-promise';

export default stats =>
  ReaderPromise.fromReaderFn(
    ({getFileStats}) => Promise.all(
      stats.map(stat =>
        getFileStats(stat.path).then(({size}) => ({...stat, size}))
      )
    )
  );
