import test from 'ava';
import R from 'ramda';
import expect, {createSpy} from 'expect';
import {postFinalPrStatus, postPendingPrStatus, postErrorPrStatus} from '../post-pr-status';

const subject = (opts = {}) =>
  postErrorPrStatus({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info',
    description: 'blah blah blah',
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo',
    ...R.pick(
      ['sha', 'targetUrl', 'label', 'description', 'githubApiToken'],
      opts
    )
  }).run({
    request: () => Promise.resolve(),
    ...R.pick(['request', 'repoOwner', 'repoName'], opts)
  });

test('postFinalPrStatus posts success pr status to GitHub when there are no failures', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  postFinalPrStatus({
    sha: 'h8g94hg9',
    assetDiffs: {
      'app.js': {
        difference: -734729,
        current: 5364634,
        percentChange: -12.046
      },
      'vendor.js': {
        difference: 839,
        current: 4336,
        percentChange: 24
      }
    },
    thresholdFailures: [],
    targetUrl: 'info.com/53',
    label: 'interesting info',
    repoOwner: 'me',
    repoName: 'my-repo',
    githubApiToken: 'h832hfo'
  }).run({request: spy});

  const [url, {headers, body}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token h832hfo');
  expect(headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(body)).toEqual({
    state: 'success',
    target_url: 'info.com/53', // eslint-disable-line camelcase
    description: 'app.js: 5.12MB (-717KB, -12.05%) \nvendor.js: 4.23KB (+839B, +24.00%)',
    context: 'interesting info'
  });
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});

test('postFinalPrStatus posts failure pr status to GitHub when there are failures', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  postFinalPrStatus({
    sha: 'h8g94hg9',
    assetDiffs: {},
    thresholdFailures: [
      {message: 'file2.js is too big'},
      {message: 'vendor asset is too big'}
    ],
    targetUrl: 'info.com/53',
    label: 'interesting info',
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo'
  }).run({request: spy});

  const [url, {headers, body}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token h832hfo');
  expect(headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(body)).toEqual({
    state: 'failure',
    target_url: 'info.com/53', // eslint-disable-line camelcase
    description: 'file2.js is too big \nvendor asset is too big',
    context: 'interesting info'
  });
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});

test('postPendingPrStatus makes request to post pending pr status to GitHub', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  postPendingPrStatus({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info',
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo'
  }).run({request: spy});

  const [url, {headers, body}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token h832hfo');
  expect(headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(body)).toEqual({
    state: 'pending',
    target_url: 'info.com/53', // eslint-disable-line camelcase
    description: 'Calculating asset diffs and threshold failures (if any)...',
    context: 'interesting info'
  });
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});

test('postErrorPrStatus makes request to post error pr status to GitHub', () => {
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info',
    description: 'Error encountered while doing thing...',
    request: spy,
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo'
  });

  const [url, {headers, body}] = spy.calls[0].arguments;
  expect(headers.Authorization).toBe('token h832hfo');
  expect(headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(body)).toEqual({
    state: 'error',
    target_url: 'info.com/53', // eslint-disable-line camelcase
    description: 'Error encountered while doing thing...',
    context: 'interesting info'
  });
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});

test('postErrorPrStatus truncates description to 140 characters (using ellipsis)', () => {
  const message = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.";
  const spy = createSpy().andReturn(Promise.resolve());
  subject({
    description: message,
    request: spy
  });

  const [, {body}] = spy.calls[0].arguments;
  // Sanity check
  expect(message.length).toBeGreaterThan(140);
  expect(JSON.parse(body).description).toBe("Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever s...");
});
