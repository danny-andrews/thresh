import {gitHubSerializer, makeGitHubRequest} from './requests';
import {toPairs, values} from 'ramda';
import filesize from 'filesize';
import {sprintf} from 'sprintf-js';
import {UTF8} from './constants';

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success'
};

const BUNDLE_DIFF_FORMAT = '%s: %s (%+i, %+.2f%%)';

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
      sprintf(
        BUNDLE_DIFF_FORMAT,
        filename,
        filesize(bundleDiff.current),
        filesize(bundleDiff.difference),
        bundleDiff.percentChange
      )
    ).join('; \n');
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
