import getPreviousAssetStats_ from './get-previous-asset-stats';
import makeCircleRequest from './make-circle-request';

export default ({circleApiToken, repoOwner, repoName}) => {
  const getPreviousAssetStats = getPreviousAssetStats_(
    makeCircleRequest({circleApiToken, repoOwner, repoName})
  );

  return ({
    getAssetStats: ({assetSizesFilepath, baseBranch}) =>
      getPreviousAssetStats({assetSizesFilepath, baseBranch})
  });
};
