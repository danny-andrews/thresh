import R from 'ramda';
import ncurry from 'ncurry';
import ReaderPromise from 'reader-promise';

import {truncate} from '../shared';
import formatAssetDiff from '../core/format-asset-diff';

const MAX_DESCRIPTION_LENGTH = 140;

const PENDING_STATUS_TEXT =
  'Calculating asset diffs and threshold failures (if any)...';

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success',
  PENDING: 'pending',
  ERROR: 'error'
};

const postCommitStatus = ncurry(
  ['sha', 'state', 'targetUrl', 'label', 'description'],
  ({sha, state, targetUrl, label, description}) => ReaderPromise.fromReaderFn(
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

export const postPendingCommitStatus = postCommitStatus({
  state: StatusStates.PENDING,
  description: PENDING_STATUS_TEXT
});

export const postErrorCommitStatus = postCommitStatus({
  state: StatusStates.ERROR
});

const postSuccessCommitStatus = postCommitStatus({state: StatusStates.SUCCESS});

const postFailureCommitStatus = postCommitStatus({state: StatusStates.FAILURE});

export const postFinalCommitStatus = ({
  assetDiffs,
  thresholdFailures,
  ...rest
}) => {
  const formatMessages = R.join(' \n');
  const successDescription = assetDiffs
    |> R.toPairs
    |> R.map(
      ([filename, assetDiff]) => formatAssetDiff({filename, ...assetDiff})
    )
    |> formatMessages;
  const failureDescription = thresholdFailures
    |> R.map(R.prop('message'))
    |> formatMessages;

  return (
    R.isEmpty(thresholdFailures)
      ? postSuccessCommitStatus({description: successDescription})
      : postFailureCommitStatus({description: failureDescription})
  )({...rest});
};
