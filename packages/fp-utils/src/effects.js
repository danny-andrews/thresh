/* eslint-disable no-shadow */
import ReaderPromise from '@danny.andrews/reader-promise';

export const resolve = (...args) => ReaderPromise.fromReaderFn(
  ({resolve}) => Promise.resolve(resolve(...args))
);
