import R from 'ramda';
import ncurry from 'ncurry';

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

const postPrStatus = makeGitHubRequest => ncurry(
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
    repoName
  }) => makeGitHubRequest({
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

export const postPendingPrStatus = _ =>
  postPrStatus(_)({
    state: StatusStates.PENDING,
    description: PENDING_STATUS_TEXT
  });

export const postErrorPrStatus = _ =>
  postPrStatus(_)({state: StatusStates.ERROR});

const postSuccessPrStatus = _ =>
  postPrStatus(_)({state: StatusStates.SUCCESS});

const postFailurePrStatus = _ =>
  postPrStatus(_)({state: StatusStates.FAILURE});

export const postFinalPrStatus = _ => ({
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
      ? postSuccessPrStatus(_)({
        description: successDescription
      })
      : postFailurePrStatus(_)({
        description: failureDescription
      })
  )({...rest});
};
