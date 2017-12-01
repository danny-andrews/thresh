import {camelizeKeys, decamelizeKeys} from 'humps';
import R from 'ramda';
import ReaderPromise from './core/reader-promise';
import {
  GitHubFetchErr,
  GitHubAuthorizationErr,
  GitHubInvalidResponseErr
} from './core/errors';

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
    })
      .catch(response =>
        R.pipe(GitHubFetchErr, a => Promise.reject(a))(url, response)
      ).then(response => {
        if(response.ok) {
          return response.json();
        } else if(isAuthError(response.status)) {
          return R.pipe(GitHubAuthorizationErr, a => Promise.reject(a))(
            url,
            response.statusText
          );
        }

        return R.pipe(GitHubInvalidResponseErr, a => Promise.reject(a))(
          url,
          response.statusText
        );
      }).then(deserializer);
  });
};
