import test from 'ava';
import expect, {createSpy} from 'expect';
import subject from '../post-pr-status';
import {ResponsePromise} from '../../test/helpers';

test('makes request to post pr status to GitHub', () => {
  const spy = createSpy().andReturn(ResponsePromise({}));
  subject({
    sha: 'h8g94hg9',
    bundleDiffs: {},
    thresholdFailures: [],
    targetUrl: 'hi bro',
    label: 'ok'
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
  expect(body).toBe('{"state":"success","target_url":"hi bro","description":"","context":"ok"}');
  expect(url).toBe('https://api.github.com/repos/me/my-repo/statuses/h8g94hg9');
});
