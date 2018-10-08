import R from 'ramda';
import ReaderPromise from '@danny.andrews/reader-promise';

export default pullRequestId => ReaderPromise.fromReaderFn(
  config => config.makeGitHubRequest(`pulls/${pullRequestId}`)
    .map(R.path(['base', 'ref']))
    .run(config)
);
