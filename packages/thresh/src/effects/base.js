/* eslint-disable no-shadow */
import ReaderPromise from '@danny.andrews/reader-promise';
import R from 'ramda';

const readerDependencyInvoker1 = ReaderPromise.invokeAt(R.identity);

const readerDependencyAtPropInvoker = R.pipe(R.prop, readerDependencyInvoker1);

export const mkdir = readerDependencyAtPropInvoker('mkdir');

export const getFileStats = readerDependencyAtPropInvoker('getFileStats');

export const readFile = readerDependencyAtPropInvoker('readFile');

export const writeFile = readerDependencyAtPropInvoker('writeFile');

export const request = readerDependencyAtPropInvoker('request');

export const resolveGlob = readerDependencyAtPropInvoker('resolveGlob');

export const logMessage = ReaderPromise.invokeAt(
  a => Promise.resolve(a),
  R.prop('logMessage')
);

export const resolve = ReaderPromise.invokeAt(
  a => Promise.resolve(a),
  R.prop('resolve')
);

export const makeGitHubRequest = ReaderPromise.invokeAt(
  (result, config) => result.run(config),
  R.prop('makeGitHubRequest')
);
