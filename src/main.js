import R from 'ramda';
import {Either} from 'monet';

import {compactAndJoin} from './shared';
import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr}
  from './shared/artifact-stores/circleci/errors';
import ReaderPromise from './shared/reader-promise';
import {DFAULT_FAILURE_THRESHOLD_STRATEGY} from './core/schemas';
import validateFailureThresholdSchema
  from './core/validate-failure-threshold-schema';
import {ASSET_STATS_FILENAME} from './core/constants';
import diffAssets from './core/diff-assets';
import getThresholdFailures from './core/get-threshold-failures';
import {NoOpenPullRequestFoundErr, NoPreviousStatsFoundForFilepath}
  from './core/errors';
import {
  logMessage,
  logError,
  postFinalPrStatus as postFinalPrStatusImpl,
  postPendingPrStatus as postPendingPrStatusImpl,
  postErrorPrStatus as postErrorPrStatusImpl,
  makeArtifactDirectory as makeArtifactDirectoryImpl,
  readManifest as readManifestImpl,
  saveStats as saveStatsImpl,
  writeAssetStats as writeAssetStatsImpl,
  writeAssetDiffs as writeAssetDiffsImpl,
  getAssetFileStats as getAssetFileStatsImpl,
  getBaseBranch as getBaseBranchImpl
} from './effects';

const warningTypes = [
  NoOpenPullRequestFoundErr,
  NoRecentBuildsFoundErr,
  NoAssetStatsArtifactFoundErr
];

const isWarningType = err =>
  R.any(Type => err.constructor === Type, warningTypes);

export default ({
  postFinalPrStatus = postFinalPrStatusImpl,
  postPendingPrStatus = postPendingPrStatusImpl,
  postErrorPrStatus = postErrorPrStatusImpl,
  makeArtifactDirectory = makeArtifactDirectoryImpl,
  readManifest = readManifestImpl,
  getAssetFileStats = getAssetFileStatsImpl,
  saveStats = saveStatsImpl,
  writeAssetStats = writeAssetStatsImpl,
  writeAssetDiffs = writeAssetDiffsImpl,
  getBaseBranch = getBaseBranchImpl,
  manifestFilepath,
  outputDirectory,
  projectName,
  pullRequestId,
  artifactsDirectory,
  buildSha,
  buildUrl,
  failureThresholds: failureThresholdsWithoutDefaults
}) => {
  const failureThresholds = failureThresholdsWithoutDefaults.map(
    threshold => ({
      strategy: DFAULT_FAILURE_THRESHOLD_STRATEGY,
      ...threshold
    })
  );
  const prStatusParams = {
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', [
      'Asset Sizes',
      projectName.orSome(null)
    ]),
    sha: buildSha
  };

  const retrieveAssetSizes2 = () =>
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

  const assetStatListToMap = assetStats => R.reduce(
    (acc, {filename, ...rest}) => ({...acc, [filename]: rest}),
    {},
    assetStats
  );

  const assetStatMapToList = a => R.toPairs(a)
    |> R.map(
      ([filename, filepath]) => ({
        filename,
        path: filepath
      })
    );

  const resolvePath = ({path, ...rest}) => ({
    ...rest,
    path: [outputDirectory, path].join('/')
  });

  const validateFailureThresholdSchema2 = (
    validateFailureThresholdSchema(failureThresholds)
      |> ReaderPromise.fromEither
  ).chainErr(e => logError(e.message));

  return validateFailureThresholdSchema2.chain(
    () => ReaderPromise.parallel([
      postPendingPrStatus(prStatusParams),
      makeArtifactDirectory({rootPath: artifactsDirectory}),
      readManifest(manifestFilepath)
        .map(assetStatMapToList)
        .map(R.map(resolvePath))
        .chain(getAssetFileStats)
        .map(assetStatListToMap),
      retrieveAssetSizes2()
    ])
  ).chain(
    ([,, currentAssetStats, previousAssetSizes]) =>

      // TODO: Use polymorphism to eliminate unsemantic branching off
      // projectName. Also, use some semantic variable like isMonorepo.
      projectName.toEither().cata(
        () => ReaderPromise.of(currentAssetStats),
        () => saveStats({
          ...(previousAssetSizes.isRight() ? previousAssetSizes.right() : {}),
          [projectName.some()]: currentAssetStats
        })
      ).chain(
        assetStats => {
          const writeAssetStats2 = writeAssetStats({
            rootPath: artifactsDirectory,
            assetStats
          });
          if(previousAssetSizes.isLeft()) {
            return writeAssetStats2.chain(
              () => ReaderPromise.fromError(previousAssetSizes.left())
            );
          }

          return ReaderPromise.fromReaderFn(config => {
            const assetDiffs = diffAssets({
              current: projectName.isSome()
                ? assetStats[projectName.some()]
                : assetStats,
              original: projectName.isSome()
                ? previousAssetSizes.right()[projectName.some()]
                : previousAssetSizes.right(),
              onMismatchFound: filepath => config.logMessage(
                NoPreviousStatsFoundForFilepath(filepath).message
              )
            });

            return Promise.resolve(assetDiffs);
          }).chain(assetDiffs => {
            const thresholdFailures = getThresholdFailures({
              failureThresholds,
              assetStats: assetDiffs
                |> R.toPairs
                |> R.map(([filepath, {current: size}]) => ({filepath, size}))
            });

            if(thresholdFailures.isLeft()) {
              return writeAssetStats2.chain(
                () => ReaderPromise.fromError(thresholdFailures.left())
              );
            }

            return ReaderPromise.parallel([
              writeAssetStats2,
              writeAssetDiffs({
                rootPath: artifactsDirectory,
                assetDiffs,
                thresholdFailures: thresholdFailures.right()
              }),
              postFinalPrStatus({
                ...prStatusParams,
                assetDiffs,
                thresholdFailures: thresholdFailures.right()
              })
            ]);
          });
        }
      )
  ).chainErr(err => {
    if(isWarningType(err)) {
      return logMessage(err.message).chain(ReaderPromise.of);
    }

    return logError(err.message).chain(
      () => postErrorPrStatus({...prStatusParams, description: err.message})
        .chainErr(e => logError(e.message))
    ).chain(() => ReaderPromise.fromError(err));
  });
};
