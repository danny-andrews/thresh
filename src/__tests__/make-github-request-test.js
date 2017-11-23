import test from 'ava';
import expect, {createSpy} from 'expect';
import R from 'ramda';
import subject from '../make-github-request';
import {ResponsePromise} from './shared/helpers';

const optsFac = (opts = {}) => ({
  path: 'owner/repo',
  ...opts
});

const fac = R.pipe(optsFac, subject);

test('sends request to https://api.github.com + path', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac({path: 'me/my-repo'}).run({request: spy});

  const [actual] = spy.calls[0].arguments;
  expect(actual).toBe('https://api.github.com/me/my-repo');
});

test('sets Accept header to application/vnd.github.v3+json', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac().run({request: spy});

  const [, {headers}] = spy.calls[0].arguments;
  expect(headers.Accept).toBe('application/vnd.github.v3+json');
});

test('sets Authorization header to token + apiToken', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac().run({request: spy, githubApiToken: 'fdlsy892'});

  const [, {headers}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token fdlsy892');
});

test('accepts additional headers', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac({
    fetchOpts: {
      headers: {
        Accept: 'application/my-mime',
        'Content-Type': 'application/json'
      }
    }
  }).run({request: spy});

  const [, {headers}] = spy.calls[0].arguments;
  expect(headers.Accept).toBe('application/my-mime');
  expect(headers['Content-Type']).toBe('application/json');
});

test('accepts other fetch optioms', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac({
    fetchOpts: {
      method: 'POST'
    }
  }).run({request: spy});

  const [, {method: actual}] = spy.calls[0].arguments;

  expect(actual).toBe('POST');
});

test('decamelizes and stringifies body', () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(ResponsePromise({my_msg: 'hello'}));
  fac({
    fetchOpts: {
      body: {
        myMsg: 'hello'
      }
    }
  }).run({request: spy});
  const [, {body: actual}] = spy.calls[0].arguments;

  expect(actual).toEqual('{"my_msg":"hello"}');
});

test('camelizes response', async () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(ResponsePromise({my_msg: 'hello'}));
  const actual = await fac().run({request: spy});

  expect(actual).toEqual({myMsg: 'hello'});
});

test.skip('returns Error if response fails', async () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  const actual = await fac({raw: true}).run({request: spy});

  expect(actual).toEqual('hi');
});

test.skip('returns Error if response fails due to authorization', async () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  const actual = await fac({raw: true}).run({request: spy});

  expect(actual).toEqual('hi');
});

test.skip('returns error if non-200 status code received', async () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  const actual = await fac({raw: true}).run({request: spy});

  expect(actual).toEqual('hi');
});
