import R from 'ramda';
import ReaderPromise from '@danny.andrews/reader-promise';
import {Maybe} from 'monet';
import {sprintf} from 'sprintf-js';

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
  getPreviousTargetStats,
  normalizeThresholds
} from './effects';
import {sumReduce, listToMap} from './shared';
import {NO_PR_FOUND_STATUS_MESSAGE_TEMPLATE} from './core/constants';

// Types
// AssetStat          :: { filepath: String, size: Int }
// Threshold          :: { maxSize: Int, targets: [String] }
// ResolvedThreshold  :: { Threshold, resolvedTargets: [String] }
// SizedThreshold     :: { ResolvedThreshold, size: Int }
// SizedTargets       :: { targets: [String], size: Int }
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

  const writeMismatchErrors = mismatchedTargetSets => ReaderPromise.parallel(
    mismatchedTargetSets.map(
      filepath => NoPreviousStatsFoundForFilepath(filepath).message
        |> logMessage
    )
  );

  const postNoPrFoundCommitStatus = assetSizes => postSuccess(
    assetSizes.map(({filepath, size}) => formatAsset(filepath, size))
      |> formatStatusMessages
      |> (stats => sprintf(NO_PR_FOUND_STATUS_MESSAGE_TEMPLATE, stats))
  );

  const getPreviousTargetStats0 = () => pullRequestId.cata(
    R.pipe(Maybe.None, ReaderPromise.of),
    prId => getPreviousTargetStats(prId).map(Maybe.Some)
  );

  const getFileSizesForResolvedThresholds = R.pipe(
    R.chain(R.prop('resolvedTargets')),
    getFileSizes
  );

  return validateThresholdSchemaWrapped(thresholds)
    .chain(normalizeThresholds)
    .chain(
      resolvedThresholds => ReaderPromise.parallel([
        getFileSizesForResolvedThresholds(resolvedThresholds),
        getPreviousTargetStats0(),
        ReaderPromise.of(resolvedThresholds),
        postPending(),
        makeArtifactDirectory(artifactsDirectory)
      ])
    )
    .chain(
      ([assetSizes, previousAssetSizes, resolvedThresholds]) =>
        writeAssetStats(assetSizes, artifactsDirectory).map(() => [
          assetSizes,
          previousAssetSizes,
          sizeThresholds(assetSizes, resolvedThresholds)
        ])
    )
    .chain(
      ([assetSizes, previousAssetSizes, sizedThresholds]) => {
        if(previousAssetSizes.isNone()) {
          return postNoPrFoundCommitStatus(assetSizes).chain(
            () => NoOpenPullRequestFoundErr().message |> logMessage
          );
        }

        const [assetDiffs, mismatchedTargetSets] = diffAssets(
          sizedThresholds,
          previousAssetSizes.some()
        );

        const thresholdFailures = getThresholdFailures(sizedThresholds);
        if(thresholdFailures.isLeft()) {
          return ReaderPromise.fromError(thresholdFailures.left());
        }

        return ReaderPromise.parallel([
          postFinal(assetDiffs, thresholdFailures.right()),
          writeAssetDiffs({
            rootPath: artifactsDirectory,
            assetDiffs,
            thresholdFailures: thresholdFailures.right()
          }),
          writeMismatchErrors(mismatchedTargetSets)
        ]);
      }
    )
    .chainErr(
      ({message, stack}) => ReaderPromise.parallel([
        postError(message),
        logMessage(Maybe.fromNull(stack).orSome(message))
      ])
    );
};
