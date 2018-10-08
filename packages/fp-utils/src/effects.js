/* eslint-disable no-shadow */
import ReaderPromise from '@danny.andrews/reader-promise';

export const request = (...args) => ReaderPromise.fromReaderFn(
  ({request}) => request(...args)
);
