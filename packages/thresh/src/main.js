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
    label: compactAndJoin(': ', ['Asset Sizes', projectName.orSome(null)]),
    sha: buildSha
  });

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
  ).map(
    ([currentAssetStats, previousAssetStats]) => projectName.toEither().cata(
      () => [currentAssetStats, previousAssetStats],
      value => [
        currentAssetStats[value],
        previousAssetStats.map(R.prop(value))
      ]
    )
  ).chain(
    ([currentAssetStats, previousAssetStats]) =>
      projectName.toEither().cata(
        () => ReaderPromise.of([currentAssetStats, previousAssetStats]),
        value => saveStats({
          ...(previousAssetStats.cata(() => ({}), R.identity)),
          [value]: currentAssetStats
        })
      )
  ).chain(
    ([currentAssetStats, previousAssetStats]) => previousAssetStats.cata(
      error => writeAssetStats(currentAssetStats, artifactsDirectory)
        .chain(() => ReaderPromise.fromError(error)),
      value => {
        const assetDiffs = diffAssets({
          current: currentAssetStats,
          original: value,
          onMismatchFound: filepath => logMessage(
            NoPreviousStatsFoundForFilepath(filepath).message
          )
        });

        return getThresholdFailures(
          R.toPairs(assetDiffs)
            |> R.map(([filepath, {current: size}]) => ({filepath, size})),
          failureThresholds
        ).cata(
          error => writeAssetStats(currentAssetStats, artifactsDirectory)
            .chain(() => ReaderPromise.fromError(error)),
          thresholdFailures => ReaderPromise.parallel([
            writeAssetStats(currentAssetStats, artifactsDirectory),
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
