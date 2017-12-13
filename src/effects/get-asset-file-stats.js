import ReaderPromise from '../core/reader-promise';

export default stats =>
  ReaderPromise.fromReaderFn(
    config => Promise.all(
      stats.map(stat =>
        config.getFileStats(stat.path).then(({size}) => ({...stat, size}))
      )
    )
  );
