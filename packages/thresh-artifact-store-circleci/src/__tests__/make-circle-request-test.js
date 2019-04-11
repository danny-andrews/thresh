import test from 'ava';
import expect, {createSpy} from 'expect';
import {NoResponseError, Non200ResponseError, InvalidResponseError}
  from '@danny.andrews/fp-utils';

import MakeCircleRequest from '../make-circle-request';

const subject = ({
  request,
  circleApiToken = '894fuhg',
  repoOwner = 'microsoft',
  repoName = 'excel',
  ...rest
} = {}) => MakeCircleRequest({circleApiToken, repoOwner, repoName})({...rest})
  .run({request});

test('sends request to url, if given', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    url: 'circleci.artifacts/my-artifact.json',
    request: spy,
    circleApiToken: '4dfasg'
  });

  const [actual] = spy.calls[0].arguments;
  expect(actual)
    .toBe('circleci.artifacts/my-artifact.json?circle-token=4dfasg');
});

test('sends request to correct url built from repoName, repoOwner, and path', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    repoOwner: 'my-account',
    repoName: 'my-repo',
    path: 'my-path',
    request: spy,
    circleApiToken: '4dfasg'
  });

  const [actual] = spy.calls[0].arguments;
  expect(actual).toBe('https://circleci.com/api/v1.1/project/github/my-account/my-repo/my-path?circle-token=4dfasg');
});

test('sets Accept header to application/json', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({request: spy});

  const [, {headers: actual}] = spy.calls[0].arguments;
  expect(actual).toEqual({Accept: 'application/json'});
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

  const [, {headers: actual}] = spy.calls[0].arguments;
  expect(actual).toEqual({
    Accept: 'application/my-mime',
    'Content-Type': 'application/json'
  });
});

test('accepts other fetch optioms', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    fetchOpts: {
      body: 'hi',
      method: 'POST'
    },
    request: spy
  });

  const [, {method, body}] = spy.calls[0].arguments;

  expect(method).toBe('POST');
  expect(body).toBe('hi');
});

test('camelizes response', () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(Promise.resolve({my_msg: 'hello'}));

  return subject({request: spy}).then(actual => {
    expect(actual).toEqual({myMsg: 'hello'});
  });
});

test("if raw is true, it doesn't deserialize response", () => {
  // eslint-disable-next-line camelcase
  const spy = createSpy().andReturn(Promise.resolve({my_msg: 'hello'}));

  return subject({raw: true, request: spy}).then(actual => {
    expect(actual).toEqual({my_msg: 'hello'}); // eslint-disable-line camelcase
  });
});

test('returns Error if request fails', () => {
  const spy = createSpy().andReturn(Promise.reject(NoResponseError('oh no')));

  return subject({request: spy, circleApiToken: 'fdlsar32', url: 'https://circleci.com/api/v1.1/hey'})
    .catch(actual => {
      expect(actual.message).toBe('Error making request to CircleCI https://circleci.com/api/v1.1/hey?circle-token=fdlsar32: oh no');
    });
});

test('returns error if non-200 status code received', () => {
  const spy = createSpy().andReturn(
    Promise.reject(
      Non200ResponseError('Internal Server Error')
    )
  );

  return subject({request: spy, circleApiToken: 'djklay32r', url: 'https://circleci.com/api/v1.1/hey'})
    .catch(actual => {
      expect(actual.message).toBe('Error making request to CircleCI https://circleci.com/api/v1.1/hey?circle-token=djklay32r: Internal Server Error');
    });
});

test('returns error if body parsing fails', () => {
  const spy = createSpy().andReturn(
    Promise.reject(
      InvalidResponseError('Cannot parse body')
    )
  );

  return subject({request: spy, circleApiToken: 'djklay32r', url: 'https://circleci.com/api/v1.1/hey'})
    .catch(actual => {
      expect(actual.message).toBe('Error making request to CircleCI https://circleci.com/api/v1.1/hey?circle-token=djklay32r: Cannot parse body');
    });
});
