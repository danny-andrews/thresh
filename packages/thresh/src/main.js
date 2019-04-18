import R from 'ramda';
import {Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';

import validateFailureThresholdSchema
  from './core/validate-failure-threshold-schema';
import {ASSET_STATS_FILENAME} from './core/constants';
import diffAssets from './core/diff-assets';
import formatAssetDiff, {formatAsset} from './core/format-asset-diff';
import getThresholdFailures from './core/get-threshold-failures';
import {NoOpenPullRequestFoundErr, NoPreviousStatsFoundForFilepath}
  from './core/errors';
import {
  getFileSizes,
  getBaseBranch,
  makeArtifactDirectory,
  CommitStatusPoster,
  saveStats,
  writeAssetDiffs,
  writeAssetStats,
  logMessage,
  resolveGlobs
} from './effects';
import {sumReduce, listToMap} from './shared';

// Types
// AssetStat :: { filepath: String, size: Int }
// Threshold :: { maxSize: Int, targets: [String] }
// ResolvedThreshold :: { Threshold, resolvedTargets: [String] }
// SizedThreshold :: { ResolvedThreshold, size: Int }
// SizedTargets :: { targets: [String], size: Int }
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

const normalizeThresholds = thresholds => ReaderPromise.parallel(
  thresholds.map(threshold => {
    const targets = [].concat(threshold.targets);

    return resolveGlobs(targets)
      .map(R.flatten)
      .map(resolvedTargets => ({...threshold, targets, resolvedTargets}));
  })
);

const assetSizeListToMap = listToMap(R.prop('filepath'));

const sizeResolvedTargets = (assetSizeMap, thresholdTargets) =>
  sumReduce(filepath => assetSizeMap[filepath].size, thresholdTargets);

const sizeThreshold = (assetSizes, thresholds) => {
  const assetSizeMap = assetSizeListToMap(assetSizes);

  return thresholds.map(
    threshold => ({
      ...threshold,
      size: sizeResolvedTargets(assetSizeMap, threshold.resolvedTargets)
    })
  );
};

export default ({
  artifactsDirectory,
  buildSha,
  buildUrl,
  thresholds,
  projectName,
  pullRequestId
}) => {
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
    const successDescription = assetDiffs.map(
      ({targets, difference, current, percentChange}) =>
        formatAssetDiff({
          filename: targets,
          difference,
          current,
          percentChange
        })
    ) |> formatMessages;
    const failureDescription = thresholdFailures.map(R.prop('message'))
      |> formatMessages;

    return (
      R.isEmpty(thresholdFailures)
        ? postSuccess(successDescription)
        : postFailure(failureDescription)
    );
  };

  return validateFailureThresholdSchemaWrapped(thresholds).chain(
    () => normalizeThresholds(thresholds)
  ).chain(
    resolvedThresholds => ReaderPromise.parallel([
      getFileSizes(
        R.chain(R.prop('resolvedTargets'), resolvedThresholds) |> R.uniq
      ),
      getPreviousAssetStats(pullRequestId),
      ReaderPromise.of(resolvedThresholds),
      postPending(),
      makeArtifactDirectory(artifactsDirectory)
    ])
  ).map(([assetSizes, previousAssetSizes, resolvedThresholds]) => [
    transformStats(assetSizes),
    previousAssetSizes.map(transformStats),
    sizeThreshold(assetSizes, resolvedThresholds)
  ]).chain(
    ([assetSizes, previousAssetSizes, sizedThresholds]) =>
      ReaderPromise.parallel([
        writeAssetStats(assetSizes, artifactsDirectory),
        saveRunningStats(assetSizes, previousAssetSizes)
      ]).map(() => [assetSizes, previousAssetSizes, sizedThresholds])
  ).chain(
    ([assetSizes, previousAssetSizes, sizedThresholds]) =>
      previousAssetSizes.cata(
        error => (
          error.constructor === NoOpenPullRequestFoundErr
            ? assetSizes.map(({filepath, size}) => formatAsset(filepath, size))
              |> R.join(' \n')
              |> noPrFoundStatusMessage
              |> postSuccess
            : ReaderPromise.of(error)
        ).chain(() => ReaderPromise.fromError(error)),
        value => diffAssets2(sizedThresholds, value)
          .map(assetDiffs => [assetDiffs, sizedThresholds])
      )
  ).chain(
    ([assetDiffs, sizedThresholds]) => getThresholdFailures(sizedThresholds)
      .cata(
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
    ({message}) => ReaderPromise.parallel([
      postError(message),
      logMessage(message)
    ])
  );
};
