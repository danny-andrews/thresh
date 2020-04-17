/* eslint-disable no-shadow */
import ReaderPromise from '@danny.andrews/reader-promise';
import R from 'ramda';

const readerDependencyProxy = selector => (...args) => ReaderPromise.asks(
  config => selector(config)(...args)
);

const readerDependencyAtPropProxy = a => readerDependencyProxy(R.prop(a));

export const mkdir = readerDependencyAtPropProxy('mkdir');

export const getFileStats = readerDependencyAtPropProxy('getFileStats');

export const readFile = readerDependencyAtPropProxy('readFile');

export const writeFile = readerDependencyAtPropProxy('writeFile');

export const request = readerDependencyAtPropProxy('request');

export const resolveGlob = readerDependencyAtPropProxy('resolveGlob');

const resolvePromise = a => Promise.resolve(a);

export const logMessage = (...args) => ReaderPromise.asks(
  config => resolvePromise(config.logMessage(...args))
);

export const resolve = (...args) => ReaderPromise.asks(
  config => resolvePromise(config.resolve(...args))
);

export const makeGitHubRequest = (...args) => ReaderPromise.asks(
  config => config.makeGitHubRequest(...args).run(config)
);

export const getCommandLineArgs = () => ReaderPromise.asks(
  config => Promise.resolve(
    config.getCommandLineArgs([
      {name: 'config-path', defaultValue: './.threshrc.toml'}
    ])
  )
);

export const getCiEnvVars = () => ReaderPromise.asks(
  ({ciAdapter}) => Promise.resolve(ciAdapter.getEnvVars())
);
