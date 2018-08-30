import getPreviousAssetStats from './get-previous-asset-stats';

export default ({githubApiToken, circleApiToken}) => ({
  getAssetStats: ({
    pullRequestId,
    assetSizesFilepath,
    repoOwner,
    repoName
  }) => getPreviousAssetStats({
    githubApiToken,
    circleApiToken,
    pullRequestId,
    assetSizesFilepath,
    repoOwner,
    repoName
  })
});
