import R from 'ramda';
import ReaderPromise from '@danny.andrews/reader-promise';

import {truncate} from '../shared';

const MAX_DESCRIPTION_LENGTH = 140;

const PENDING_STATUS_TEXT =
  'Calculating asset diffs and threshold failures (if any)...';

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success',
  PENDING: 'pending',
  ERROR: 'error'
};

const postCommitStatus = R.curry(
  (sha, targetUrl, label, state, description) => ReaderPromise.fromReaderFn(
    config => config.makeGitHubRequest(
      `statuses/${sha}`,
      {
        method: 'POST',
        body: {
          state,
          targetUrl,
          context: label,
          description: truncate({maxSize: MAX_DESCRIPTION_LENGTH}, description)
        }
      }
    ).run(config)
  )
);

export default ({sha, targetUrl, label}) => {
  const postCommitStatus2 = postCommitStatus(sha, targetUrl, label);

  const postSuccess = postCommitStatus2(StatusStates.SUCCESS);
  const postFailure = postCommitStatus2(StatusStates.FAILURE);
  const postError = postCommitStatus2(StatusStates.ERROR);
  const postPending = () => postCommitStatus2(
    StatusStates.PENDING,
    PENDING_STATUS_TEXT
  );

  return {postError, postPending, postSuccess, postFailure};
};
