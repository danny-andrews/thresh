import test from 'ava';
import expect, {createSpy} from 'expect';
import {PromiseError} from '../shared';
import makeGithubRequest from '../make-github-request';
import {ResponsePromise} from './shared/helpers';

const subject = (opts = {}) => {
  const {
    githubApiToken,
    request,
    ...rest
  } = {
    githubApiToken: 'fjidq8y32',
    path: 'owner/repo',
    ...opts
  };

  return makeGithubRequest(rest).run({githubApiToken, request});
};

test('sends request to https://api.github.com + path', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  subject({path: 'me/my-repo', request: spy});

  const [actual] = spy.calls[0].arguments;
  expect(actual).toBe('https://api.github.com/me/my-repo');
});

test('sets Accept header to application/vnd.github.v3+json', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  subject({request: spy});

  const [, {headers}] = spy.calls[0].arguments;
  expect(headers.Accept).toBe('application/vnd.github.v3+json');
});

test('sets Authorization header to token + apiToken', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  subject({request: spy, githubApiToken: 'fdlsy892'});

  const [, {headers}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token fdlsy892');
});

test('accepts additional headers', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  subject({
    fetchOpts: {
      headers: {
        Accept: 'application/my-mime',
        'Content-Type': 'application/json'
      }
    },
    request: spy
  });

  const [, {headers}] = spy.calls[0].arguments;
  expect(headers.Accept).toBe('application/my-mime');
  expect(headers['Content-Type']).toBe('application/json');
});

test('accepts other fetch optioms', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  subject({
    fetchOpts: {
      method: 'POST'
    },
    request: spy
  });

  const [, {method: actual}] = spy.calls[0].arguments;

  expect(actual).toBe('POST');
});

test('decamelizes and stringifies body', () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(ResponsePromise({my_msg: 'hello'}));
  subject({
    fetchOpts: {
      body: {
        myMsg: 'hello'
      }
    },
    request: spy
  });
  const [, {body: actual}] = spy.calls[0].arguments;

  expect(actual).toEqual('{"my_msg":"hello"}');
});

test('camelizes response', async () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(ResponsePromise({my_msg: 'hello'}));
  const actual = await subject({request: spy});

  expect(actual).toEqual({myMsg: 'hello'});
});

test('returns Error if response fails', () => {
  const spy = createSpy().andReturn(PromiseError('oh no'));

  return subject({request: spy, githubApiToken: 'dfhsa8632r3'})
    .catch(actual => {
      expect(actual).toBeA(Error);
      expect(actual.message).toBe('Error making request to GitHub https://api.github.com/owner/repo: Error: oh no');
    });
});

test('returns error if non-200 status code received', () => {
  const spy = createSpy().andReturn(
    ResponsePromise('oh no', {status: 500, statusText: 'Internal Server Error'})
  );

  return subject({request: spy, githubApiToken: 'dfhsa8632r3'})
    .catch(actual => {
      expect(actual).toBeA(Error);
      expect(actual.message).toBe('Error making request to GitHub https://api.github.com/owner/repo: Internal Server Error');
    });
});

test('returns authorization error if UNATHORIZED status received', () => {
  const spy = createSpy().andReturn(
    ResponsePromise('oh no', {status: 401, statusText: 'Internal Server Error'})
  );

  return subject({request: spy, githubApiToken: 'dfhsa8632r3'})
    .catch(actual => {
      expect(actual).toBeA(Error);
      expect(actual.message).toBe('Authorization failed for request to GitHub https://api.github.com/owner/repo. Did you provide a correct GitHub Api Token? Original response: Internal Server Error');
    });
});

test('returns authorization error if FORBIDDEN status received', () => {
  const spy = createSpy().andReturn(
    ResponsePromise('oh no', {status: 403, statusText: 'Internal Server Error'})
  );

  return subject({request: spy, githubApiToken: 'dfhsa8632r3'})
    .catch(actual => {
      expect(actual).toBeA(Error);
      expect(actual.message).toBe('Authorization failed for request to GitHub https://api.github.com/owner/repo. Did you provide a correct GitHub Api Token? Original response: Internal Server Error');
    });
});
