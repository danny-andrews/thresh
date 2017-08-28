import makeGitHubRequest from './make-github-request';
import getPrStatusPayload from './core/get-pr-status-payload';
import ReaderPromise from './core/reader-promise';

export default ({sha, bundleDiffs, thresholdFailures, targetUrl, label}) =>
  ReaderPromise.fromReaderFn(config =>
    makeGitHubRequest({
      path: `repos/${config.repoOwner}/${config.repoName}/statuses/${sha}`,
      fetchOpts: {
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
        body: getPrStatusPayload({
          bundleDiffs,
          thresholdFailures,
          targetUrl,
          label
        })
      }
    }).run(config)
  );
