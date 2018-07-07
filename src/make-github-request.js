import {camelizeKeys, decamelizeKeys} from 'humps';
import R from 'ramda';
import ReaderPromise from './core/reader-promise';
import {
  GitHubFetchErr,
  GitHubAuthorizationErr,
  GitHubInvalidResponseErr
} from './core/errors';
import {NoResponseError, Non200ResponseError, InvalidResponseError, switchCaseF}
  from './shared';

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

const mapError = ({url, context, constructor}) =>
  switchCaseF({
    [NoResponseError]: GitHubFetchErr(url, context),
    [InvalidResponseError]: GitHubInvalidResponseErr(url, context),
    [Non200ResponseError]: isAuthError(context.status)
      ? GitHubAuthorizationErr(url, context.statusText)
      : GitHubInvalidResponseErr(url, context.statusText)
  })()(constructor);

export default ({path, fetchOpts = {}}) => {
  const body = serializer(fetchOpts.body);
  const url = `${HOSTNAME}/${path}`;

  return ReaderPromise.fromReaderFn(({request, githubApiToken}) => {
    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${githubApiToken}`,
      ...(fetchOpts.method === 'POST'
        ? {'Content-Type': 'application/json'}
        : {}
      ),
      ...fetchOpts.headers
    };

    return request(url, {
      headers,
      body,
      ...R.omit(['headers', 'body'], fetchOpts)
    })
      .then(deserializer)
      .catch(({constructor, context}) =>
        Promise.reject(mapError({url, context, constructor}))
      );
  });
};
