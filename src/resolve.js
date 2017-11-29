import R from 'ramda';
import ReaderPromise from './core/reader-promise';

export default (...args) => ReaderPromise.fromReaderFn(
  ({resolve}) => R.pipe(resolve, a => Promise.resolve(a))(...args)
);
