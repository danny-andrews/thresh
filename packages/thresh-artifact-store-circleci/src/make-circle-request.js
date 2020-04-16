import {camelizeKeys} from 'humps';
import R from 'ramda';
import {sprintf} from 'sprintf-js';
import ReaderPromise from '@danny.andrews/reader-promise';

import {CircleCiFetchErr, CircleCiInvalidResponseErr} from './errors';

export const request = (...args) => ReaderPromise.asks(
  ({request}) => request(...args) // eslint-disable-line no-shadow
);

const circleDeserializer = camelizeKeys;

const API_ROOT = 'https://circleci.com/api/v1.1';

const mapError = error => error.cata({
  NoResponseError: context => CircleCiFetchErr(context.url, context.message),
  InvalidResponseError: context =>
    CircleCiInvalidResponseErr(context.url, context.message),
  Non200ResponseError: context =>
    CircleCiInvalidResponseErr(context.url, context.message)
});

export default ({circleApiToken, repoOwner, repoName}) =>
  ({path, url, fetchOpts = {}, raw = false}) => {
    const protocolHostAndPath = url || [
      API_ROOT,
      'project',
      'github',
      repoOwner,
      repoName,
      path
    ].join('/');

    const finalUrl = sprintf(
      '%s?circle-token=%s',
      protocolHostAndPath,
      circleApiToken
    );

    return request(finalUrl, {
      headers: {Accept: 'application/json', ...fetchOpts.headers},
      ...R.omit('headers', fetchOpts)
    }).map(raw ? R.identity : circleDeserializer)
      .mapErr(mapError);
  };
