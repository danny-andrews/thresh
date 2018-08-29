import {getPreviousAssetSizes} from './get-previous-asset-sizes';

export default ({githubApiToken, circleApiToken}) => ({
  getAssetStats: ({
    pullRequestId,
    assetSizesFilepath,
    repoOwner,
    repoName
  }) => getPreviousAssetSizes({
    githubApiToken,
    circleApiToken,
    pullRequestId,
    assetSizesFilepath,
    repoOwner,
    repoName
  })
});
