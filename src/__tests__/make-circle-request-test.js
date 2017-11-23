import test from 'ava';
import expect, {createSpy} from 'expect';
import R from 'ramda';
import subject from '../make-circle-request';
import {ResponsePromise} from './shared/helpers';

const optsFac = (opts = {}) => ({path: 'hey', token: 'jfdsa03f', ...opts});

const fac = R.pipe(optsFac, subject);

test('sends request to url, if given', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac({url: 'circleci.artifacts/my-artifact.json'})
    .run({request: spy, circleApiToken: '4dfasg'});

  const [actual] = spy.calls[0].arguments;
  expect(actual)
    .toBe('circleci.artifacts/my-artifact.json?circle-token=4dfasg');
});

test('sends request to https://circleci.com/api/v1.1 + path', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac({path: 'my-account/my-repo'})
    .run({request: spy, circleApiToken: '4dfasg'});

  const [actual] = spy.calls[0].arguments;
  expect(actual).toBe('https://circleci.com/api/v1.1/my-account/my-repo?circle-token=4dfasg');
});

test('sets Accept header to application/json', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac().run({request: spy});

  const [, {headers: actual}] = spy.calls[0].arguments;
  expect(actual).toEqual({Accept: 'application/json'});
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

  const [, {headers: actual}] = spy.calls[0].arguments;
  expect(actual).toEqual({
    Accept: 'application/my-mime',
    'Content-Type': 'application/json'
  });
});

test('accepts other fetch optioms', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  fac({
    fetchOpts: {
      body: 'hi',
      method: 'POST'
    }
  }).run({request: spy});

  const [, {method, body}] = spy.calls[0].arguments;

  expect(method).toBe('POST');
  expect(body).toBe('hi');
});

test('camelizes response', async () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(ResponsePromise({my_msg: 'hello'}));
  const actual = await fac().run({request: spy});

  expect(actual).toEqual({myMsg: 'hello'});
});

test("if raw is true, it doesn't deserialize response", async () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(ResponsePromise({my_msg: 'hello'}));
  const actual = await fac({raw: true}).run({request: spy});

  expect(actual).toEqual({my_msg: 'hello'}); // eslint-disable-line camelcase
});

test.skip('returns Error if response fails', async () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  const actual = await fac({raw: true}).run({request: spy});

  expect(actual).toEqual('hi');
});

test.skip('returns error if non-200 status code received', async () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  const actual = await fac({raw: true}).run({request: spy});

  expect(actual).toEqual('hi');
});
