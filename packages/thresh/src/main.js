import R from 'ramda';
import ReaderPromise from '@danny.andrews/reader-promise';
import {Maybe} from 'monet';

import validateThresholdSchema from './core/validate-threshold-schema';
import diffAssets from './core/diff-assets';
import formatAssetDiff, {formatAsset} from './core/format-asset-diff';
import getThresholdFailures from './core/get-threshold-failures';
import {NoPreviousStatsFoundForFilepath, NoOpenPullRequestFoundErr}
  from './core/errors';
import {
  getFileSizes,
  makeArtifactDirectory,
  CommitStatusPoster,
  writeAssetDiffs,
  writeAssetStats,
  logMessage,
  getPreviousAssetStats,
  normalizeThresholds
} from './effects';
import {sumReduce, listToMap} from './shared';

// Types
// AssetStat :: { filepath: String, size: Int }
// Threshold :: { maxSize: Int, targets: [String] }
// ResolvedThreshold :: { Threshold, resolvedTargets: [String] }
// SizedThreshold :: { ResolvedThreshold, size: Int }
// SizedTargets :: { targets: [String], size: Int }
export default ({
  artifactsDirectory,
  buildSha,
  buildUrl,
  pullRequestId,
  thresholds
}) => {
  const {
    postPending,
    postError,
    postFailure,
    postSuccess
  } = CommitStatusPoster({targetUrl: `${buildUrl}#artifacts`, sha: buildSha});
  const formatStatusMessages = R.join(' \n');
  const postFinal = (assetDiffs, thresholdFailures) => {
    if(!R.isEmpty(thresholdFailures)) {
      return postFailure(
        thresholdFailures.map(R.prop('message')) |> formatStatusMessages
      );
    }

    return postSuccess(assetDiffs.map(formatAssetDiff) |> formatStatusMessages);
  };

  const validateThresholdSchemaWrapped = R.pipe(
    validateThresholdSchema,
    ReaderPromise.fromEither
  );

  const sizeThresholds = (assetSizes, resolvedThresholds) => {
    const assetSizeListToMap = listToMap(R.prop('filepath'));
    const assetSizeMap = assetSizeListToMap(assetSizes);
    const sizeTargets = sumReduce(filepath => assetSizeMap[filepath].size);

    return resolvedThresholds.map(
      threshold => ({
        ...threshold,
        size: sizeTargets(threshold.resolvedTargets)
      })
    );
  };

  const diffAssets2 = R.curry(
    (current, original) => ReaderPromise.asks(
      config => Promise.resolve(
        diffAssets(
          current,
          original,
          filepath => NoPreviousStatsFoundForFilepath(filepath)
            |> R.prop('message')
            |> config.logMessage
        )
      )
    )
  );

  return validateThresholdSchemaWrapped(thresholds)
    .chain(normalizeThresholds)
    .chain(
      resolvedThresholds => ReaderPromise.parallel([
        getFileSizes(R.chain(R.prop('resolvedTargets'), resolvedThresholds)),
        pullRequestId.cata(
          () => Maybe.None() |> ReaderPromise.of,
          prId => getPreviousAssetStats(prId).map(Maybe.Some)
        ),
        ReaderPromise.of(resolvedThresholds),
        postPending(),
        makeArtifactDirectory(artifactsDirectory)
      ])
    )
    .chain(
      ([assetSizes, previousAssetSizes, resolvedThresholds]) => {
        const sizedThresholds = sizeThresholds(assetSizes, resolvedThresholds);
        const noPrFoundStatusMessage = statsString =>
          `${statsString} (no open PR; cannot calculate diffs)`;

        return ReaderPromise.parallel([
          previousAssetSizes.cata(
            () => (
              assetSizes.map(({filepath, size}) => formatAsset(filepath, size))
                |> formatStatusMessages
                |> noPrFoundStatusMessage
                |> postSuccess
            ).chain(
              R.pipe(NoOpenPullRequestFoundErr, ReaderPromise.fromError)
            ),
            diffAssets2(sizedThresholds)
          ),
          getThresholdFailures(sizedThresholds) |> ReaderPromise.fromEither,
          writeAssetStats(assetSizes, artifactsDirectory)
        ]);
      }
    )
    .chain(
      ([assetDiffs, thresholdFailures]) =>
        ReaderPromise.parallel([
          writeAssetDiffs({
            rootPath: artifactsDirectory,
            assetDiffs,
            thresholdFailures
          }),
          postFinal(assetDiffs, thresholdFailures)
        ])
    )
    .chainErr(
      error => error.constructor === NoOpenPullRequestFoundErr
        ? logMessage(error.message)
        : ReaderPromise.fromError(error)
    )
    .chainErr(
      ({message, stack}) => ReaderPromise.parallel([
        postError(message),
        logMessage(Maybe.fromNull(stack).orSome(message))
      ])
    );
};
