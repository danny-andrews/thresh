import R from 'ramda';

import {truncate} from '../shared';

import {makeGitHubRequest} from './base';

const MAX_DESCRIPTION_LENGTH = 140;

const PENDING_STATUS_TEXT =
  'Calculating asset diffs and threshold failures (if any)...';

const COMMIT_STATUS_LABEL = 'Asset Sizes';

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success',
  PENDING: 'pending',
  ERROR: 'error'
};

const postCommitStatus = R.curry(
  (sha, targetUrl, state, description) => makeGitHubRequest(
    `statuses/${sha}`,
    {
      method: 'POST',
      body: {
        state,
        targetUrl,
        context: COMMIT_STATUS_LABEL,
        description: truncate({maxSize: MAX_DESCRIPTION_LENGTH}, description)
      }
    }
  )
);

export default ({sha, targetUrl}) => {
  const postCommitStatus2 = postCommitStatus(sha, targetUrl);

  const postSuccess = postCommitStatus2(StatusStates.SUCCESS);
  const postFailure = postCommitStatus2(StatusStates.FAILURE);
  const postError = postCommitStatus2(StatusStates.ERROR);
  const postPending = () => postCommitStatus2(
    StatusStates.PENDING,
    PENDING_STATUS_TEXT
  );

  return {postError, postPending, postSuccess, postFailure};
};
