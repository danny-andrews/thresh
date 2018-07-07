import R from 'ramda';
import ncurry from 'ncurry';
import makeGitHubRequest from '../make-github-request';
import ReaderPromise from '../core/reader-promise';
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

const postPrStatus = ncurry(
  ['sha', 'state', 'targetUrl', 'label', 'description'],
  ({sha, state, targetUrl, label, description}) =>
    ReaderPromise.fromReaderFn(config =>
      // TODO: We should be injecting this dependency. It would make testing
      //   much easier.
      makeGitHubRequest({
        path: `repos/${config.repoOwner}/${config.repoName}/statuses/${sha}`,
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
      }).run(config)
    )
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
  const successDescription = R.pipe(
    R.toPairs,
    R.map(([filename, assetDiff]) => formatAssetDiff({filename, ...assetDiff})),
    formatMessages
  )(assetDiffs);
  const failureDescription = R.pipe(
    R.map(R.prop('message')),
    formatMessages
  )(thresholdFailures);

  return (
    R.isEmpty(thresholdFailures)
      ? postSuccessPrStatus({description: successDescription})
      : postFailurePrStatus({description: failureDescription})
  )({...rest});
};
