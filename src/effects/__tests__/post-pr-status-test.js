import test from 'ava';
import expect, {createSpy} from 'expect';
import ReaderPromise from '../../shared/reader-promise';
import {postFinalPrStatus, postPendingPrStatus, postErrorPrStatus} from '../post-pr-status';
import {firstCallFirstArgument} from '../../test/helpers';

const subject = ({makeGithubRequest, ...rest} = {}) =>
  postErrorPrStatus(makeGithubRequest || ReaderPromise.of())({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info',
    description: 'blah blah blah',
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo',
    ...rest
  }).run();

test('postFinalPrStatus posts success pr status to GitHub when there are no failures', () => {
  const spy = createSpy().andReturn(ReaderPromise.of());
  postFinalPrStatus(spy)({
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
  });

  const {path, githubApiToken, fetchOpts} = firstCallFirstArgument(spy);
  expect(path).toBe('repos/me/my-repo/statuses/h8g94hg9');
  expect(githubApiToken).toBe('h832hfo');
  expect(fetchOpts).toEqual({
    method: 'POST',
    body: {
      state: 'success',
      targetUrl: 'info.com/53',
      description: 'app.js: 5.12MB (-717KB, -12.05%) \nvendor.js: 4.23KB (+839B, +24.00%)',
      context: 'interesting info'
    }
  });
});

test('postFinalPrStatus posts failure pr status to GitHub when there are failures', () => {
  const spy = createSpy().andReturn(ReaderPromise.of());
  postFinalPrStatus(spy)({
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
  });

  const {path, githubApiToken, fetchOpts} = firstCallFirstArgument(spy);
  expect(path).toBe('repos/me/my-repo/statuses/h8g94hg9');
  expect(githubApiToken).toBe('h832hfo');
  expect(fetchOpts).toEqual({
    method: 'POST',
    body: {
      state: 'failure',
      targetUrl: 'info.com/53',
      description: 'file2.js is too big \nvendor asset is too big',
      context: 'interesting info'
    }
  });
});

test('postPendingPrStatus makes request to post pending pr status to GitHub', () => {
  const spy = createSpy().andReturn(ReaderPromise.of());
  postPendingPrStatus(spy)({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info',
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo'
  }).run({request: spy});

  const {path, githubApiToken, fetchOpts} = firstCallFirstArgument(spy);
  expect(path).toBe('repos/me/my-repo/statuses/h8g94hg9');
  expect(githubApiToken).toBe('h832hfo');
  expect(fetchOpts).toEqual({
    method: 'POST',
    body: {
      state: 'pending',
      targetUrl: 'info.com/53',
      description: 'Calculating asset diffs and threshold failures (if any)...',
      context: 'interesting info'
    }
  });
});

test('postErrorPrStatus makes request to post error pr status to GitHub', () => {
  const spy = createSpy().andReturn(ReaderPromise.of());
  subject({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info',
    description: 'Error encountered while doing thing...',
    request: spy,
    githubApiToken: 'h832hfo',
    repoOwner: 'me',
    repoName: 'my-repo',
    makeGithubRequest: spy
  });

  const {path, githubApiToken, fetchOpts} = firstCallFirstArgument(spy);
  expect(path).toBe('repos/me/my-repo/statuses/h8g94hg9');
  expect(githubApiToken).toBe('h832hfo');
  expect(fetchOpts).toEqual({
    method: 'POST',
    body: {
      state: 'error',
      targetUrl: 'info.com/53',
      description: 'Error encountered while doing thing...',
      context: 'interesting info'
    }
  });
});

test('postErrorPrStatus truncates description to 140 characters (using ellipsis)', () => {
  const message = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.";
  const spy = createSpy().andReturn(ReaderPromise.of());
  subject({
    description: message,
    makeGithubRequest: spy
  });

  const {fetchOpts} = firstCallFirstArgument(spy);
  // Sanity check
  expect(message.length).toBeGreaterThan(140);
  expect(fetchOpts.body.description).toBe("Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever s...");
});
