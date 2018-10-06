/* eslint-disable no-process-env */
import {request} from '../..';

import getAssetStats from './get-previous-asset-stats';
import MakeCircleRequest from './make-circle-request';

export default ({repoOwner, repoName}) => ({
  getAssetStats: ({assetSizesFilepath, baseBranch}) =>
    getAssetStats({assetSizesFilepath, baseBranch}).run({
      makeCircleRequest: MakeCircleRequest({
        circleApiToken: process.env.CIRCLE_API_TOKEN,
        repoOwner,
        repoName
      }),
      request
    })
});
