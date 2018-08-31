import {Either} from 'monet';

import ReaderPromise from '../../reader-promise';

import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr} from './errors';
import {CircleCiBuildStatuses} from './constants';

export default makeCircleRequest => ({assetSizesFilepath, baseBranch}) => {
  const getRecentBuilds = branch => makeCircleRequest({path: `tree/${branch}`});

  const getBuildArtifacts = buildNumber =>
    makeCircleRequest({path: `${buildNumber}/artifacts`});

  const getAssetSizeArtifact = assetSizeArtifactUrl =>
    makeCircleRequest({url: assetSizeArtifactUrl, raw: true});

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
