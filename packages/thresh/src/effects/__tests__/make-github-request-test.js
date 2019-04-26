import test from 'ava';
import expect, {createSpy} from 'expect';
import {
  NoResponseError,
  Non200ResponseError,
  InvalidResponseError
} from '@danny.andrews/fp-utils';
import R from 'ramda';

import makeGithubRequest from '../make-github-request';
import {firstCallFirstArgument, firstCallArguments} from '../../test/helpers';

const subject = ({
  githubApiToken = 'fjidq8y32',
  repoOwner = 'owner',
  repoName = 'repo',
  path = 'my-stuff',
  fetchOpts,
  request
} = {}) => makeGithubRequest({
  githubApiToken,
  repoOwner,
  repoName
})(path, fetchOpts).run({request});

test('sends request to correct path', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    repoOwner: 'me',
    repoName: 'my-repo',
    path: 'my-path',
    request: spy
  });

  const actual = R.view(firstCallFirstArgument, spy);
  expect(actual).toBe('https://api.github.com/repos/me/my-repo/my-path');
});

test('sets Accept header to application/vnd.github.v3+json', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({request: spy});

  const [, {headers}] = R.view(firstCallArguments, spy);
  expect(headers.Accept).toBe('application/vnd.github.v3+json');
});

test('sets Authorization header to token + apiToken', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({request: spy, githubApiToken: 'fdlsy892'});

  const [, {headers}] = R.view(firstCallArguments, spy);
  expect(headers.Authorization).toBe('token fdlsy892');
});

test('accepts additional headers', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    fetchOpts: {
      headers: {
        Accept: 'application/my-mime',
        'Content-Type': 'application/json'
      }
    },
    request: spy
  });

  const [, {headers}] = R.view(firstCallArguments, spy);
  expect(headers.Accept).toBe('application/my-mime');
  expect(headers['Content-Type']).toBe('application/json');
});

test('accepts other fetch options', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    fetchOpts: {
      method: 'POST'
    },
    request: spy
  });

  const [, {method: actual}] = R.view(firstCallArguments, spy);

  expect(actual).toBe('POST');
});

test('decamelizes and stringifies body', () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(Promise.resolve({my_msg: 'hello'}));
  subject({
    fetchOpts: {
      body: {
        myMsg: 'hello'
      }
    },
    request: spy
  });
  const [, {body: actual}] = R.view(firstCallArguments, spy);

  expect(actual).toEqual('{"my_msg":"hello"}');
});

test('camelizes response', () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(Promise.resolve({my_msg: 'hello'}));

  return subject({request: spy}).then(actual => {
    expect(actual).toEqual({myMsg: 'hello'});
  });
});

test('returns error if response fails', () => {
  const spy = createSpy().andReturn(
    Promise.reject(
      NoResponseError('oh no')
    )
  );

  return subject({
    request: spy,
    githubApiToken: 'dfhsa8632r3',
    repoOwner: 'owner',
    repoName: 'repo',
    path: 'my-stuff'
  }).catch(actual => {
    expect(actual.message).toBe('Error making request to GitHub https://api.github.com/repos/owner/repo/my-stuff: oh no');
  });
});

test('returns error if body parsing fails', () => {
  const spy = createSpy().andReturn(
    Promise.reject(
      InvalidResponseError('Cannot parse body')
    )
  );

  return subject({
    request: spy,
    githubApiToken: 'dfhsa8632r3',
    repoOwner: 'owner',
    repoName: 'repo',
    path: 'my-stuff'
  }).catch(actual => {
    expect(actual.message).toBe('Error making request to GitHub https://api.github.com/repos/owner/repo/my-stuff: Cannot parse body');
  });
});

test('returns error if non-200 status code received', () => {
  const spy = createSpy().andReturn(
    Promise.reject(
      Non200ResponseError({data: 'Internal Server Error'})
    )
  );

  return subject({
    request: spy,
    githubApiToken: 'dfhsa8632r3',
    repoOwner: 'owner',
    repoName: 'repo',
    path: 'my-stuff'
  }).catch(actual => {
    expect(actual.message).toBe('Error making request to GitHub https://api.github.com/repos/owner/repo/my-stuff: Internal Server Error');
  });
});

test('returns authorization error if UNATHORIZED status received', () => {
  const spy = createSpy().andReturn(
    Promise.reject(
      Non200ResponseError({status: 401, data: 'Unathorized'})
    )
  );

  return subject({
    request: spy,
    githubApiToken: 'dfhsa8632r3',
    repoOwner: 'owner',
    repoName: 'repo',
    path: 'my-stuff'
  }).catch(actual => {
    expect(actual.message).toBe('Authorization failed for request to GitHub https://api.github.com/repos/owner/repo/my-stuff. Did you provide a correct GitHub Api Token? Original response: Unathorized');
  });
});

test('returns authorization error if FORBIDDEN status received', () => {
  const spy = createSpy().andReturn(
    Promise.reject(
      Non200ResponseError({status: 403, data: 'Forbidden'})
    )
  );

  return subject({
    request: spy,
    githubApiToken: 'dfhsa8632r3',
    repoOwner: 'owner',
    repoName: 'repo',
    path: 'my-stuff'
  }).catch(actual => {
    expect(actual.message).toBe('Authorization failed for request to GitHub https://api.github.com/repos/owner/repo/my-stuff. Did you provide a correct GitHub Api Token? Original response: Forbidden');
  });
});
