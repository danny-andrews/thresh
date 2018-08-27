import {retrieveAssetSizes} from '../../../effects';

export default ({githubApiToken, circleApiToken}) => ({
  getAssetStats: ({
    pullRequestId,
    assetSizesFilepath,
    repoOwner,
    repoName
  }) => retrieveAssetSizes({
    githubApiToken,
    circleApiToken,
    pullRequestId,
    assetSizesFilepath,
    repoOwner,
    repoName
  })
});
