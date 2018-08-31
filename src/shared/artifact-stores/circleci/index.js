import getPreviousAssetStats from './get-previous-asset-stats';

export default ({circleApiToken}) => ({
  getAssetStats: ({
    assetSizesFilepath,
    baseBranch,
    repoOwner,
    repoName
  }) => getPreviousAssetStats({
    circleApiToken,
    assetSizesFilepath,
    baseBranch,
    repoOwner,
    repoName
  })
});
