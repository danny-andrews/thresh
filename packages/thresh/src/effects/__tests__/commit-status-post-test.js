import test from 'ava';
import expect, {createSpy} from 'expect';
import ReaderPromise from '@danny.andrews/reader-promise';

import CommitStatusPoster from '../commit-status-poster';
import {firstCallArguments} from '../../test/helpers';

test('postPending makes request to post pending commit status to GitHub', () => {
  const spy = createSpy().andReturn(ReaderPromise.of());
  const {postPending} = CommitStatusPoster({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info'
  });
  postPending().run({makeGitHubRequest: spy});

  const [path, fetchOpts] = firstCallArguments(spy);
  expect(path).toBe('statuses/h8g94hg9');
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

test('postError makes request to post error commit status to GitHub', () => {
  const spy = createSpy().andReturn(ReaderPromise.of());
  const {postError} = CommitStatusPoster({
    sha: 'h8g94hg9',
    targetUrl: 'info.com/53',
    label: 'interesting info'
  });

  postError('Error encountered while doing thing...').run({makeGitHubRequest: spy});

  const [path, fetchOpts] = firstCallArguments(spy);
  expect(path).toBe('statuses/h8g94hg9');
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
  const {postError} = CommitStatusPoster({});
  const message = "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.";
  const spy = createSpy().andReturn(ReaderPromise.of());
  postError(message).run({makeGitHubRequest: spy});

  const [, fetchOpts] = firstCallArguments(spy);

  // Sanity check
  expect(message.length).toBeGreaterThan(140);
  expect(fetchOpts.body.description).toBe("Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever s...");
});
