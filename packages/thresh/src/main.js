import R from 'ramda';
import {Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr}
  from '@danny.andrews/thresh-artifact-store-circleci';

import {compactAndJoin} from './shared';
import validateFailureThresholdSchema
  from './core/validate-failure-threshold-schema';
import {ASSET_STATS_FILENAME} from './core/constants';
import diffAssets from './core/diff-assets';
import getThresholdFailures from './core/get-threshold-failures';
import {NoOpenPullRequestFoundErr, NoPreviousStatsFoundForFilepath}
  from './core/errors';
import {
  getAssetFilestats,
  getBaseBranch,
  makeArtifactDirectory,
  CommitStatusPoster,
  readManifest,
  saveStats,
  writeAssetDiffs,
  writeAssetStats,
  logMessage
} from './effects';

const WARNING_TYPES = new Set([
  NoOpenPullRequestFoundErr,
  NoRecentBuildsFoundErr,
  NoAssetStatsArtifactFoundErr
]);

const isWarningType = err => WARNING_TYPES.has(err.constructor);

const assetStatListToMap = assetStats => R.reduce(
  (acc, {filename, ...rest}) => ({...acc, [filename]: rest}),
  {},
  assetStats
);

const assetStatMapToList = a => R.toPairs(a) |> R.map(
  ([filename, filepath]) => ({
    filename,
    path: filepath
  })
);

const getPreviousAssetStats = pullRequestId =>
  pullRequestId.toEither().cata(
    () => NoOpenPullRequestFoundErr() |> Either.Left |> ReaderPromise.of,
    prId => getBaseBranch(prId).chain(
      baseBranch => ReaderPromise.fromReaderFn(
        ({artifactStore}) => artifactStore.getAssetStats({
          baseBranch,
          assetSizesFilepath: ASSET_STATS_FILENAME
        })
      )
    )
  );

const validateFailureThresholdSchemaWrapped = failureThresholds =>
  validateFailureThresholdSchema(failureThresholds) |> ReaderPromise.fromEither;

const MonoRepoActions = projectName => ({
  transformStats: R.prop(projectName),
  saveRunningStats: (currentAssetStats, previousAssetStats) => saveStats({
    ...(previousAssetStats.cata(() => ({}), R.identity)),
    [projectName]: currentAssetStats
  })
});

const SingleRepoActions = () => ({
  transformStats: R.identity,
  saveRunningStats: ReaderPromise.of
});

const diffAssets2 = (current, original) => diffAssets(
  current,
  original,
  {
    onMismatchFound: filepath => NoPreviousStatsFoundForFilepath(filepath)
      |> R.prop('message')
      |> logMessage
  }
);

export default ({
  artifactsDirectory,
  buildSha,
  buildUrl,
  failureThresholds,
  manifestFilepath,
  outputDirectory,
  projectName,
  pullRequestId
}) => {
  const resolvePath = path => [outputDirectory, path].join('/');
  const decorateAsset = ({path, ...rest}) => ({
    ...rest,
    path: resolvePath(path)
  });
  const {postPending, postError, postFinal} = CommitStatusPoster({
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Asset Sizes', projectName.orSome('null')]),
    sha: buildSha
  });

  const {transformStats, saveRunningStats} = projectName.toEither()
    .cata(SingleRepoActions, MonoRepoActions);

  return validateFailureThresholdSchemaWrapped(failureThresholds).chain(
    () => ReaderPromise.parallel([
      readManifest(manifestFilepath)
        .map(assetStatMapToList)
        .map(R.map(decorateAsset))
        .chain(getAssetFilestats)
        .map(assetStatListToMap),
      getPreviousAssetStats(pullRequestId),
      postPending(),
      makeArtifactDirectory(artifactsDirectory)
    ])
  ).map(([currentAssetStats, previousAssetStats]) => [
    transformStats(currentAssetStats),
    previousAssetStats.map(transformStats)
  ]).chain(
    ([currentAssetStats, previousAssetStats]) => ReaderPromise.parallel([
      writeAssetStats(currentAssetStats, artifactsDirectory),
      saveRunningStats(currentAssetStats, previousAssetStats)
    ]).map(() => [currentAssetStats, previousAssetStats])
  ).chain(
    ([currentAssetStats, previousAssetStats]) => previousAssetStats.cata(
      ReaderPromise.fromError,
      value => {
        const assetDiffs = diffAssets2(currentAssetStats, value);

        return getThresholdFailures(
          R.toPairs(assetDiffs)
            |> R.map(([filepath, {current: size}]) => ({filepath, size})),
          failureThresholds
        ).cata(
          ReaderPromise.fromError,
          thresholdFailures => ReaderPromise.parallel([
            writeAssetDiffs({
              rootPath: artifactsDirectory,
              assetDiffs,
              thresholdFailures
            }),
            postFinal(assetDiffs, thresholdFailures)
          ])
        );
      }
    )
  ).chainErr(
    err => ReaderPromise.parallel([
      postError(err.message),
      isWarningType(err)
        ? logMessage(err.message)
        : ReaderPromise.fromError(err)
    ])
  );
};
