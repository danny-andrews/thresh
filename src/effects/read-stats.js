import R from 'ramda';
import {parseJSON} from '../shared';
import {StatsFileReadErr} from '../core/errors';
import ReaderPromise from '../core/reader-promise';

export default statsFilepath =>
  ReaderPromise.fromReaderFn(({readFile}) =>
    readFile(statsFilepath)
      .catch(error =>
        Promise.reject(StatsFileReadErr(error))
      )
      .then(contents =>
        parseJSON(contents).cata(
          error => Promise.reject(StatsFileReadErr(error)),
          R.identity
        )
      )
  );
