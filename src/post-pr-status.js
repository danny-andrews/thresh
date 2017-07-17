import {gitHubSerializer, makeGitHubRequest} from './requests';
import {toPairs, values} from 'ramda';
import filesize from 'filesize';
import {sprintf} from 'sprintf-js';
import {UTF8} from './constants';

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success'
};

const formatBundleDiff = opts => {
  const {filename, difference, current, percentChange} = opts;

  const {value, symbol} = filesize(difference, {output: 'object'});

  const diffStats = difference === 0
    ? 'No Change'
    : sprintf(
      '%+i%s, %+.2f%%',
      value,
      symbol,
      percentChange
    );

  return sprintf(
    '%s: %s (%s)',
    filename,
    filesize(current, {spacer: ''}),
    diffStats
  );
};

export default opts => {
  const {
    sha,
    repoOwner,
    repoName,
    githubApiToken,
    bundleDiffs,
    failureThreshold,
    targetUrl = '',
    label
  } = opts;

  const allBelowErrorThreshold = values(bundleDiffs)
    .every(({percentChange}) => (percentChange < failureThreshold));

  const state = allBelowErrorThreshold
    ? StatusStates.SUCCESS
    : StatusStates.FAILURE;

  const description = toPairs(bundleDiffs)
    .map(([filename, bundleDiff]) =>
      formatBundleDiff({filename, ...bundleDiff})
    ).join(' \n');
  const byteLength = Buffer.byteLength(description, UTF8);
  const payload = {
    state,
    targetUrl,
    description: description.substring(0, byteLength),
    context: label
  };

  return makeGitHubRequest({
    githubApiToken,
    fetchOpts: {
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
      body: gitHubSerializer(payload)
    },
    path: `repos/${repoOwner}/${repoName}/statuses/${sha}`
  });
};
