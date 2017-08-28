import {camelizeKeys, decamelizeKeys} from 'humps';
import R from 'ramda';
import {isError, PromiseError} from './shared';
import ReaderPromise from './core/reader-promise';

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

export default ({path, fetchOpts = {}}) => {
  const body = serializer(fetchOpts.body);
  const url = `${HOSTNAME}/${path}`;

  return ReaderPromise.fromReaderFn(({request, githubApiToken}) => {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${githubApiToken}`,
      ...fetchOpts.headers
    };

    return request(url, {
      headers,
      body,
      ...R.omit(['headers', 'body'], fetchOpts)
    }).then(response => {
      if(response.ok) {
        return response.json();
      } else if(isAuthError(response.status)) {
        return PromiseError(
          `Authorization failed for request to GitHub ${url}. `
            + 'Did you provide a correct GitHub Api Token? Original '
            + `response: ${response.statusText}`
        );
      } else if(isError(response)) {
        return PromiseError(
          `Error making request to GitHub ${url}: ${response}`
        );
      }

      return PromiseError(
        `Error making request to GitHub ${url}: ${response.statusText}`
      );
    }).then(deserializer);
  });
};
