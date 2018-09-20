import R from 'ramda';
import {Either} from 'monet';

import {compactAndJoin} from './shared';
import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr}
  from './shared/artifact-stores/circleci/errors';
import ReaderPromise from './shared/reader-promise';
import validateFailureThresholdSchema
  from './core/validate-failure-threshold-schema';
import {ASSET_STATS_FILENAME} from './core/constants';
import diffAssets from './core/diff-assets';
import getThresholdFailures from './core/get-threshold-failures';
import {NoOpenPullRequestFoundErr, NoPreviousStatsFoundForFilepath}
  from './core/errors';
import * as effects from './effects';

const warningTypes = new Set([
  NoOpenPullRequestFoundErr,
  NoRecentBuildsFoundErr,
  NoAssetStatsArtifactFoundErr
]);

const isWarningType = err => warningTypes.has(err.constructor);

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

const getAssetStats = (pullRequestId, getBaseBranch) =>
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

const validateFailureThresholdSchemaWrapped = failureThresholds => (
  validateFailureThresholdSchema(failureThresholds)
      |> ReaderPromise.fromEither
).chainErr(e => effects.logError(e.message));

export default ({
  postFinalCommitStatus = effects.postFinalCommitStatus,
  postPendingCommitStatus = effects.postPendingCommitStatus,
  postErrorCommitStatus = effects.postErrorCommitStatus,
  makeArtifactDirectory = effects.makeArtifactDirectory,
  readManifest = effects.readManifest,
  getAssetFileStats = effects.getAssetFileStats,
  saveStats = effects.saveStats,
  writeAssetStats = effects.writeAssetStats,
  writeAssetDiffs = effects.writeAssetDiffs,
  getBaseBranch = effects.getBaseBranch,
  manifestFilepath,
  outputDirectory,
  projectName,
  pullRequestId,
  artifactsDirectory,
  buildSha,
  buildUrl,
  failureThresholds
}) => {
  const prStatusParams = {
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Asset Sizes', projectName.orSome(null)]),
    sha: buildSha
  };

  const resolvePath = path => [outputDirectory, path].join('/');
  const decorateAsset = ({path, ...rest}) => ({
    ...rest,
    path: resolvePath(path)
  });

  return validateFailureThresholdSchemaWrapped(failureThresholds).chain(
    () => ReaderPromise.parallel([
      postPendingCommitStatus(prStatusParams),
      makeArtifactDirectory({rootPath: artifactsDirectory}),
      readManifest(manifestFilepath)
        .map(assetStatMapToList)
        .map(R.map(decorateAsset))
        .chain(getAssetFileStats)
        .map(assetStatListToMap),
      getAssetStats(pullRequestId, getBaseBranch)
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
              postFinalCommitStatus({
                ...prStatusParams,
                assetDiffs,
                thresholdFailures: thresholdFailures.right()
              })
            ]);
          });
        }
      )
  ).chainErr(
    err => postErrorCommitStatus({
      ...prStatusParams,
      description: err.message
    }).chain(
      () => isWarningType(err)
        ? effects.logMessage(err.message)
        : ReaderPromise.fromError(err)
    )
  );
};
