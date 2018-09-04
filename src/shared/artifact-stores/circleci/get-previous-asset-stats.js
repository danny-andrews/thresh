import {Either} from 'monet';

import ReaderPromise from '../../reader-promise';

import makeCircleRequest from './make-circle-request';
import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr} from './errors';

const CircleCiBuildStatuses = {SUCCESS: 'success'};

export default ({
  assetSizesFilepath,
  circleApiToken,
  repoOwner,
  repoName,
  baseBranch
}) => {
  const repoProjectPath = [repoOwner, repoName].join('/');

  const getRecentBuilds = branch =>
    makeCircleRequest({
      path: `project/github/${repoProjectPath}/tree/${branch}`,
      circleApiToken
    });

  const getBuildArtifacts = buildNumber =>
    makeCircleRequest({
      path: `project/github/${repoProjectPath}/${buildNumber}/artifacts`,
      circleApiToken
    });

  const getAssetSizeArtifact = assetSizeArtifactUrl =>
    makeCircleRequest({url: assetSizeArtifactUrl, raw: true, circleApiToken});

  return getRecentBuilds(baseBranch).chain(recentBuilds => {
    if(recentBuilds.length === 0) {
      return baseBranch
        |> NoRecentBuildsFoundErr
        |> Either.Left
        |> ReaderPromise.of;
    }

    const [firstItem] = recentBuilds;
    const buildNumber = firstItem.status === CircleCiBuildStatuses.SUCCESS
      ? firstItem.buildNum
      : firstItem.previousSuccessfulBuild.buildNum;

    return getBuildArtifacts(buildNumber).chain(buildArtifacts => {
      const artifactPathRegExp = new RegExp(`${assetSizesFilepath}$`);
      const assetSizeArtifact = buildArtifacts
        .find(artifact => artifact.path.match(artifactPathRegExp));
      if(!assetSizeArtifact) {
        return NoAssetStatsArtifactFoundErr(baseBranch, buildNumber)
          |> Either.Left
          |> ReaderPromise.of;
      }

      return getAssetSizeArtifact(assetSizeArtifact.url).map(Either.Right);
    });
  });
};
