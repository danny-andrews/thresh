import ReaderPromise from '../shared/reader-promise';

export default stats =>
  ReaderPromise.fromReaderFn(
    ({getFileStats}) => Promise.all(
      stats.map(stat =>
        getFileStats(stat.path).then(({size}) => ({...stat, size}))
      )
    )
  );
