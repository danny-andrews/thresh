import test from 'ava';
import expect, {createSpy} from 'expect';
import {postFinalPrStatus, postPendingPrStatus, postErrorPrStatus} from '../post-pr-status';
import {ResponsePromise} from '../../test/helpers';

test('postFinalPrStatus makes request to post pr status to GitHub', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  postFinalPrStatus({
    sha: 'h8g94hg9',
    bundleDiffs: {},
    thresholdFailures: [],
    targetUrl: 'info.com/53',
    label: 'interesting info'
  }).run({
    request: spy,
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo'
  });

  const [url, {headers, method, body}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token h832hfo');
  expect(headers['Content-Type']).toBe('application/json');
  expect(method).toBe('POST');
  expect(JSON.parse(body)).toEqual({
    state: 'success',
    target_url: 'info.com/53', // eslint-disable-line camelcase
    description: '',
    context: 'interesting info'
  });
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});

test('postPendingPrStatus makes request to post pending pr status to GitHub', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  postPendingPrStatus({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info'
  }).run({
    request: spy,
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo'
  });

  const [url, {headers, method, body}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token h832hfo');
  expect(headers['Content-Type']).toBe('application/json');
  expect(method).toBe('POST');
  expect(JSON.parse(body)).toEqual({
    state: 'pending',
    target_url: 'info.com/53', // eslint-disable-line camelcase
    description: 'Calculating bundle diffs and threshold failures (if any)...',
    context: 'interesting info'
  });
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});

test('postErrorPrStatus makes request to post pending pr status to GitHub', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  postErrorPrStatus({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info',
    description: 'Error encountered while doing thing...'
  }).run({
    request: spy,
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo'
  });

  const [url, {headers, method, body}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token h832hfo');
  expect(headers['Content-Type']).toBe('application/json');
  expect(method).toBe('POST');
  expect(JSON.parse(body)).toEqual({
    state: 'error',
    target_url: 'info.com/53', // eslint-disable-line camelcase
    description: 'Error encountered while doing thing...',
    context: 'interesting info'
  });
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});

test.todo('trims description to 140 characters');
