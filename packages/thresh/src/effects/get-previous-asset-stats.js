import ReaderPromise from '@danny.andrews/reader-promise';

import {ASSET_STATS_FILENAME} from '../core/constants';

import getBaseBranch from './get-base-branch';

export default pullRequestId => getBaseBranch(pullRequestId).chain(
  baseBranch => ReaderPromise.asks(
    ({artifactStore}) => artifactStore.getAssetStats(
      baseBranch,
      ASSET_STATS_FILENAME
    )
  )
);
