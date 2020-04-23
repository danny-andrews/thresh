import R from 'ramda';
import ReaderPromise from '@danny.andrews/reader-promise';
import {Maybe} from 'monet';
import {sprintf} from 'sprintf-js';

import validateThresholdSchema from './core/validate-threshold-schema';
import diffTargets from './core/diff-targets';
import formatTargetDiff, {formatTarget} from './core/format-target-diff';
import getThresholdFailures from './core/get-threshold-failures';
import {NoPreviousStatsFoundForFilepath, NoOpenPullRequestFoundErr}
  from './core/errors';
import {
  getFileSizes,
  makeArtifactDirectory,
  CommitStatusPoster,
  writeTargetDiffs,
  writeTargetStats,
  logMessage,
  getPreviousTargetStats,
  normalizeThresholds
} from './effects';
import {sumReduce, listToMap} from './shared';
import {NO_PR_FOUND_STATUS_MESSAGE_TEMPLATE} from './core/constants';

// Types
// TargetStat         :: { filepath: String, size: Int }
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
  const postFinal = (targetDiffs, thresholdFailures) => {
    if(!R.isEmpty(thresholdFailures)) {
      return postFailure(
        thresholdFailures.map(R.prop('message')) |> formatStatusMessages
      );
    }

    return targetDiffs.map(formatTargetDiff)
      |> formatStatusMessages
      |> postSuccess;
  };

  const validateThresholdSchemaWrapped = R.pipe(
    validateThresholdSchema,
    ReaderPromise.fromEither
  );

  const sizeThresholds = (targetSizes, resolvedThresholds) => {
    const targetSizeListToMap = listToMap(R.prop('filepath'));
    const targetSizeMap = targetSizeListToMap(targetSizes);
    const sizeTargets = sumReduce(filepath => targetSizeMap[filepath].size);

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

  const postNoPrFoundCommitStatus = targetSizes => postSuccess(
    targetSizes.map(({filepath, size}) => formatTarget(filepath, size))
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
      ([targetSizes, previousTargetSizes, resolvedThresholds]) =>
        writeTargetStats(targetSizes, artifactsDirectory).map(() => [
          targetSizes,
          previousTargetSizes,
          sizeThresholds(targetSizes, resolvedThresholds)
        ])
    )
    .chain(
      ([targetSizes, previousTargetSizes, sizedThresholds]) => {
        if(previousTargetSizes.isNone()) {
          return postNoPrFoundCommitStatus(targetSizes).chain(
            () => NoOpenPullRequestFoundErr().message |> logMessage
          );
        }

        const [targetDiffs, mismatchedTargetSets] = diffTargets(
          sizedThresholds,
          previousTargetSizes.some()
        );

        const thresholdFailures = getThresholdFailures(sizedThresholds);
        if(thresholdFailures.isLeft()) {
          return ReaderPromise.fromError(thresholdFailures.left());
        }

        return ReaderPromise.parallel([
          postFinal(targetDiffs, thresholdFailures.right()),
          writeTargetDiffs({
            rootPath: artifactsDirectory,
            targetDiffs,
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
