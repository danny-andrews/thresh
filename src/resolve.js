import ReaderPromise from './shared/reader-promise';

export default (...args) => ReaderPromise.fromReaderFn(
  ({resolve}) => Promise.resolve(resolve(...args))
);
