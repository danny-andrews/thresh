import R from 'ramda';
import ncurry from 'ncurry';

import {truncate} from '../shared';
import formatAssetDiff from '../core/format-asset-diff';

import makeGitHubRequestImpl from './make-github-request';

const MAX_DESCRIPTION_LENGTH = 140;

const PENDING_STATUS_TEXT =
  'Calculating asset diffs and threshold failures (if any)...';

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success',
  PENDING: 'pending',
  ERROR: 'error'
};

const postPrStatus = ncurry(
  [
    'sha',
    'state',
    'targetUrl',
    'label',
    'description',
    'githubApiToken',
    'repoOwner',
    'repoName'
  ],
  ({
    sha,
    state,
    targetUrl,
    label,
    description,
    githubApiToken,
    repoOwner,
    repoName,
    makeGitHubRequest
  }) => (makeGitHubRequest || makeGitHubRequestImpl)({
    path: `repos/${repoOwner}/${repoName}/statuses/${sha}`,
    githubApiToken,
    fetchOpts: {
      method: 'POST',
      body: {
        state,
        targetUrl,
        context: label,
        description: truncate(
          {maxSize: MAX_DESCRIPTION_LENGTH},
          description
        )
      }
    }
  })
);

export const postPendingPrStatus = postPrStatus({
  state: StatusStates.PENDING,
  description: PENDING_STATUS_TEXT
});

export const postErrorPrStatus = postPrStatus({state: StatusStates.ERROR});

const postSuccessPrStatus = postPrStatus({state: StatusStates.SUCCESS});

const postFailurePrStatus = postPrStatus({state: StatusStates.FAILURE});

export const postFinalPrStatus = ({
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
      ? postSuccessPrStatus({description: successDescription})
      : postFailurePrStatus({description: failureDescription})
  )({...rest});
};
