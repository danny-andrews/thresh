import ReaderPromise from '@danny.andrews/reader-promise';

import {TARGET_STATS_FILENAME} from '../core/constants';

import getBaseBranch from './get-base-branch';

export default pullRequestId => getBaseBranch(pullRequestId).chain(
  baseBranch => ReaderPromise.asks(
    ({artifactStore}) => artifactStore.getTargetStats(
      baseBranch,
      TARGET_STATS_FILENAME
    )
  )
);
