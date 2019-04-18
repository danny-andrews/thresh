import {Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import R from 'ramda';

import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr} from './errors';

const BuildStatuses = {SUCCESS: 'success', FIXED: 'fixed'};

const isSuccessfulBuildStatus = buildStatus => [
  BuildStatuses.SUCCESS,
  BuildStatuses.FIXED
].contains(buildStatus);

export default (baseBranch, assetStatsFilepath) => {
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
      return NoRecentBuildsFoundErr(baseBranch)
        |> Either.Left
        |> ReaderPromise.of;
    }

    const [firstItem] = recentBuilds;
    const buildNumber = isSuccessfulBuildStatus(firstItem.status)
      ? firstItem.buildNum
      : R.path(['previousSuccessfulBuild', 'buildNum'], firstItem);

    if(!buildNumber) {
      return NoRecentBuildsFoundErr(baseBranch)
        |> Either.Left
        |> ReaderPromise.of;
    }

    return getBuildArtifacts(buildNumber).chain(buildArtifacts => {
      const artifactPathRegExp = new RegExp(`${assetStatsFilepath}$`);
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
