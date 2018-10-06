import ReaderPromise from '../packages/reader-promise';

const STATS_DB_KEY = 'asset-stats';

export default stats => ReaderPromise.fromReaderFn(
  config => config.db.then(db => {
    const combinedStats = {
      ...stats,
      ...(db.get(STATS_DB_KEY) || {})
    };

    db.put(STATS_DB_KEY, combinedStats);

    return Promise.resolve(combinedStats);
  })
);
