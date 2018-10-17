import R from 'ramda';
import {Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr}
  from '@danny.andrews/thresh-artifact-store-circleci';

import validateFailureThresholdSchema
  from './core/validate-failure-threshold-schema';
import {ASSET_STATS_FILENAME} from './core/constants';
import diffAssets from './core/diff-assets';
import formatAssetDiff, {formatAsset} from './core/format-asset-diff';
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
        ({artifactStore}) => artifactStore.getAssetStats(
          baseBranch,
          ASSET_STATS_FILENAME
        )
      )
    )
  );

const noPrFoundStatusMessage = statsString =>
  `${statsString} (no open PR to calculate diffs from)`;

const validateFailureThresholdSchemaWrapped = failureThresholds =>
  validateFailureThresholdSchema(failureThresholds) |> ReaderPromise.fromEither;

const COMMIT_STATUS_BASE_LABEL = 'Asset Sizes';

const MonoRepoActions = projectName => ({
  transformStats: R.prop(projectName),
  saveRunningStats: (currentAssetStats, previousAssetStats) => saveStats({
    ...(previousAssetStats.cata(() => ({}), R.identity)),
    [projectName]: currentAssetStats
  }),
  getCommitStatusLabel: () => `${COMMIT_STATUS_BASE_LABEL}: ${projectName}`
});

const SingleRepoActions = () => ({
  transformStats: R.identity,
  saveRunningStats: ReaderPromise.of,
  getCommitStatusLabel: () => COMMIT_STATUS_BASE_LABEL
});

const diffAssets2 = (current, original) => ReaderPromise.fromReaderFn(
  config => Promise.resolve(
    diffAssets(
      current,
      original,
      {
        onMismatchFound: filepath => NoPreviousStatsFoundForFilepath(filepath)
          |> R.prop('message')
          |> config.logMessage
      }
    )
  )
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
  const {
    transformStats,
    saveRunningStats,
    getCommitStatusLabel
  } = projectName.toEither().cata(SingleRepoActions, MonoRepoActions);
  const {postPending, postError, postFailure, postSuccess} =
    CommitStatusPoster({
      targetUrl: `${buildUrl}#artifacts`,
      label: getCommitStatusLabel(),
      sha: buildSha
    });
  const postFinal = (assetDiffs, thresholdFailures) => {
    const formatMessages = R.join(' \n');
    const successDescription = assetDiffs
      |> R.toPairs
      |> R.map(
        ([filename, {difference, current, percentChange}]) =>
          formatAssetDiff({filename, difference, current, percentChange})
      )
      |> formatMessages;
    const failureDescription = thresholdFailures
      |> R.map(R.prop('message'))
      |> formatMessages;

    return (
      R.isEmpty(thresholdFailures)
        ? postSuccess(successDescription)
        : postFailure(failureDescription)
    );
  };

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
      error => (
        R.toPairs(currentAssetStats)
        |> R.map(([filename, {size}]) => formatAsset(filename, size))
        |> R.join(' \n')
        |> noPrFoundStatusMessage
        |> postSuccess
      ).chain(() => logMessage(error.message)),
      value => diffAssets2(currentAssetStats, value)
    )
  ).chain(
    assetDiffs => getThresholdFailures(
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
