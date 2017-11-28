import makeGitHubRequest from '../make-github-request';
import getPrStatusPayload, {StatusStates} from '../core/get-pr-status-payload';
import ReaderPromise from '../core/reader-promise';

const postPrStatus = ({sha, body}) =>
  ReaderPromise.fromReaderFn(config =>
    makeGitHubRequest({
      path: `repos/${config.repoOwner}/${config.repoName}/statuses/${sha}`,
      fetchOpts: {
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
        body
      }
    }).run(config)
  );

export const postFinalPrStatus = ({
  sha,
  bundleDiffs,
  thresholdFailures,
  targetUrl,
  label
}) => postPrStatus({
  sha,
  body: getPrStatusPayload({
    bundleDiffs,
    thresholdFailures,
    targetUrl,
    label
  })
});

export const postPendingPrStatus = ({sha, targetUrl, label}) => postPrStatus({
  sha,
  body: {
    state: StatusStates.PENDING,
    targetUrl,
    context: label,
    description: 'Calculating bundle diffs and threshold failures (if any)...'
  }
});
