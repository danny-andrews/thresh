import R from 'ramda';
import {gitHubSerializer, makeGitHubRequest} from './requests';
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
    thresholdFailures,
    targetUrl = '',
    label
  } = opts;
  const {state, description} = R.ifElse(
    R.pipe(R.isEmpty, R.always)(thresholdFailures.length),
    R.always({
      state: StatusStates.SUCCESS,
      description: R.toPairs(bundleDiffs)
        .map(([filename, bundleDiff]) =>
          formatBundleDiff({filename, ...bundleDiff})
        ).join(' \n')
    }),
    R.always({
      state: StatusStates.FAILURE,
      description: thresholdFailures.map(({message}) => message).join(' \n')
    })
  );

  const byteLength = Buffer.byteLength(description, UTF8);
  const payload = {
    state,
    targetUrl,
    description: description.substring(0, byteLength),
    context: label
  };

  console.log(payload, 'ok');

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
