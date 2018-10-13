import {Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';

import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr} from './errors';

const CircleCiBuildStatuses = {SUCCESS: 'success'};

export default (assetSizesFilepath, baseBranch) => {
  const getRecentBuilds = branch => ReaderPromise.fromReaderFn(
    config => config.makeCircleRequest({path: `tree/${branch}`}).run(config)
  );

  const getBuildArtifacts = buildNumber => ReaderPromise.fromReaderFn(
    config => config.makeCircleRequest({path: `${buildNumber}/artifacts`})
      .run(config)
  );

  const getAssetSizeArtifact = assetSizeArtifactUrl =>
    ReaderPromise.fromReaderFn(
      config => config.makeCircleRequest({url: assetSizeArtifactUrl, raw: true})
        .run(config)
    );

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
