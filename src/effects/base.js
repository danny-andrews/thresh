/* eslint-disable no-shadow */
import ReaderPromise from '../shared/reader-promise';

export const mkdir = (...args) => ReaderPromise.fromReaderFn(
  ({mkdir}) => mkdir(...args)
);

export const resolve = (...args) => ReaderPromise.fromReaderFn(
  ({resolve}) => Promise.resolve(resolve(...args))
);

export const getFileStats = (...args) => ReaderPromise.fromReaderFn(
  ({getFileStats}) => getFileStats(...args)
);

export const readFile = (...args) => ReaderPromise.fromReaderFn(
  ({readFile}) => readFile(...args)
);

export const writeFile = (...args) => ReaderPromise.fromReaderFn(
  ({writeFile}) => writeFile(...args)
);

export const request = (...args) => ReaderPromise.fromReaderFn(
  ({request}) => request(...args)
);

export const logMessage = (...args) => ReaderPromise.fromReaderFn(
  ({logMessage}) => Promise.resolve(logMessage(...args))
);

export const logError = (...args) => ReaderPromise.fromReaderFn(
  ({logError}) => Promise.resolve(logError(...args))
);

export const readEnvVar = name => ReaderPromise.fromReaderFn(
  ({env}) => env[name]
);

export const writeEnvVar = (name, value) => ReaderPromise.fromReaderFn(
  ({env}) => { env[name] = value; }
);
