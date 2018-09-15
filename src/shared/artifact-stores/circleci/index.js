import {request} from '../..';

import getPreviousAssetStats from './get-previous-asset-stats';
import MakeCircleRequest from './make-circle-request';

export default ({circleApiToken, repoOwner, repoName}) => ({
  getAssetStats: ({assetSizesFilepath, baseBranch}) =>
    getPreviousAssetStats({assetSizesFilepath, baseBranch}).run({
      makeCircleRequest: MakeCircleRequest({
        circleApiToken,
        repoOwner,
        repoName
      }),
      request
    })
});
