import {camelizeKeys, decamelizeKeys} from 'humps';
import R from 'ramda';

import {
  GitHubFetchErr,
  GitHubAuthorizationErr,
  GitHubInvalidResponseErr
} from '../core/errors';

import {request} from './base';

/* eslint-disable no-magic-numbers */
const Statuses = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403
};
/* eslint-enable no-magic-numbers */

const isAuthError = status => R.contains(status, [
  Statuses.UNAUTHORIZED,
  Statuses.FORBIDDEN
]);

const serializer = payload => JSON.stringify(decamelizeKeys(payload));
const deserializer = payload => camelizeKeys(payload);
const HOSTNAME = 'https://api.github.com';

const mapError = error =>
  error.cata({
    NoResponseError: context => GitHubFetchErr(context.url, context.message),
    InvalidResponseError: context =>
      GitHubInvalidResponseErr(context.url, context.message),
    Non200ResponseError: context => isAuthError(context.status)
      ? GitHubAuthorizationErr(context.url, context.body)
      : GitHubInvalidResponseErr(context.url, context.body)
  });

export default ({githubApiToken, repoOwner, repoName}) =>
  (path, {body, headers, method, ...rest} = {}) => {
    const url = `${HOSTNAME}/repos/${repoOwner}/${repoName}/${path}`;

    return request(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${githubApiToken}`,
        ...(method === 'POST' ? {'Content-Type': 'application/json'} : {}),
        ...headers
      },
      body: serializer(body),
      method,
      ...rest
    })
      .map(deserializer)
      .mapErr(mapError);
  };
