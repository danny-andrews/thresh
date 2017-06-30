import {fmtPercent, fmtSigned} from './util';
import {gitHubSerializer, makeGitHubRequest} from './requests';
import {pipe, toPairs, values} from 'ramda';
import filesize from 'filesize';
import {UTF8} from './constants';

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success'
};

const PERCENT_DIFF_PERCENTAGE = 2;

const fmtPercentDiff = number =>
  pipe(fmtSigned, fmtPercent)(number.toFixed(PERCENT_DIFF_PERCENTAGE));

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

  const description = toPairs(bundleDiffs).map(([filename, bundleDiff]) =>
    `${filename}: ${filesize(bundleDiff.current)} `
      + `${fmtPercentDiff(bundleDiff.percentChange)}`
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
