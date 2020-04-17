import ReaderPromise from '@danny.andrews/reader-promise';
import R from 'ramda';

import {NoRecentBuildsFoundErr, NoTargetStatsArtifactFoundErr} from './errors';

const BuildStatuses = {SUCCESS: 'success', FIXED: 'fixed'};

const isSuccessfulBuildStatus = buildStatus => [
  BuildStatuses.SUCCESS,
  BuildStatuses.FIXED
].includes(buildStatus);

const makeCircleRequest = (...args) => ReaderPromise.asks(
  config => config.makeCircleRequest(...args).run(config)
);

export default (baseBranch, targetStatsFilepath) => {
  const getLatestSuccessfulBuildNumber = () =>
    makeCircleRequest({path: `tree/${baseBranch}`}).chain(recentBuilds => {
      if(recentBuilds.length === 0) {
        return NoRecentBuildsFoundErr(baseBranch) |> ReaderPromise.fromError;
      }

      const [firstItem] = recentBuilds;
      const buildNumber = isSuccessfulBuildStatus(firstItem.status)
        ? firstItem.buildNum
        : R.path(['previousSuccessfulBuild', 'buildNum'], firstItem);

      if(!buildNumber) {
        return NoRecentBuildsFoundErr(baseBranch) |> ReaderPromise.fromError;
      }

      return ReaderPromise.of(buildNumber);
    });

  const getTargetSizeArtifactUrl = buildNumber =>
    makeCircleRequest({path: `${buildNumber}/artifacts`})
      .chain(buildArtifacts => {
        const artifactPathRegExp = new RegExp(`${targetStatsFilepath}$`, 'u');
        const targetSizeArtifact = buildArtifacts
          .find(artifact => artifact.path.match(artifactPathRegExp));
        if(!targetSizeArtifact) {
          return NoTargetStatsArtifactFoundErr(baseBranch, buildNumber)
            |> ReaderPromise.fromError;
        }

        return ReaderPromise.of(targetSizeArtifact.url);
      });

  const getTargetSizeArtifact = targetSizeArtifactUrl => makeCircleRequest({
    url: targetSizeArtifactUrl,
    raw: true
  });

  return getLatestSuccessfulBuildNumber()
    .chain(getTargetSizeArtifactUrl)
    .chain(getTargetSizeArtifact);
};
