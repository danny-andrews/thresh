import R from 'ramda';
import path from 'path';
import {
  BUNDLE_SIZES_DIFF_FILENAME,
  BUNDLE_SIZES_FILENAME,
  OUTPUT_FILEPATH
} from './core/constants';
import bundleSizesFromWebpackStats
  from './core/bundle-sizes-from-webpack-stats';
import diffBundles from './core/diff-bundles';
import getThresholdFailures from './core/get-threshold-failures';
import {compactAndJoin, SchemaValidator} from './shared';
import {NoOpenPullRequestFoundErr, InvalidFailureThresholdOptionErr}
  from './core/errors';
import ReaderPromise from './core/reader-promise';
import {failureThresholdListSchema, DFAULT_FAILURE_THRESHOLD_STRATEGY}
  from './core/schemas';
import {
  makeArtifactDirectory,
  postFinalPrStatus,
  postPendingPrStatus,
  readStats,
  retrieveBaseBundleSizes,
  writeBundleDiff,
  writeBundleSizes
} from './effects';

export default opts => {
  const {
    statsFilepath,
    projectName = '',
    buildSha,
    buildUrl,
    pullRequestId,
    artifactsDirectory,
    effects = {
      retrieveBaseBundleSizes,
      postFinalPrStatus,
      postPendingPrStatus,
      readStats,
      makeArtifactDirectory,
      writeBundleSizes,
      writeBundleDiff
    }
  } = opts;
  const failureThresholds = opts.failureThresholds.map(
    threshold => ({
      strategy: DFAULT_FAILURE_THRESHOLD_STRATEGY,
      ...threshold
    })
  );

  const validator = SchemaValidator();
  const isfailureThresholdsValid = validator.validate(
    failureThresholdListSchema,
    failureThresholds
  );

  if(!isfailureThresholdsValid) {
    return R.pipe(
      validator.errorsText,
      InvalidFailureThresholdOptionErr,
      ReaderPromise.fromError
    )(validator.errors, {separator: '\n'});
  }

  const buildArtifactFilepath = (...args) => ReaderPromise.fromReaderFn(
    ({resolve}) => R.pipe(resolve, a => Promise.resolve(a))(
      artifactsDirectory,
      OUTPUT_FILEPATH,
      projectName,
      ...args
    )
  );

  const makeArtifactDirectory2 = () => buildArtifactFilepath()
    .chain(effects.makeArtifactDirectory);

  const writeBundleSizes2 = bundleSizes =>
    buildArtifactFilepath(BUNDLE_SIZES_FILENAME)
      .chain(filepath => effects.writeBundleSizes({filepath, bundleSizes}));

  const retrieveBaseBundleSizes2 = () =>
    pullRequestId.toEither().cata(
      () => ReaderPromise.fromError(NoOpenPullRequestFoundErr()),
      prId => effects.retrieveBaseBundleSizes({
        pullRequestId: prId,
        bundleSizesFilepath: path.join(projectName, BUNDLE_SIZES_FILENAME)
      })
    );

  const createBundleDiff = ({bundleSizes, baseBundleSizes}) => diffBundles({
    current: bundleSizes,
    original: baseBundleSizes
  });

  const getThresholdFailures2 = bundleDiffs => getThresholdFailures({
    failureThresholds,
    assetStats: R.pipe(
      R.toPairs,
      R.map(([filepath, {current: size}]) => ({filepath, size}))
    )(bundleDiffs)
  });

  const writeBundleDiff2 = ({bundleDiffs, thresholdFailures}) =>
    buildArtifactFilepath(BUNDLE_SIZES_DIFF_FILENAME)
      .chain(filepath =>
        effects.writeBundleDiff({filepath, bundleDiffs, thresholdFailures})
      );

  const prStatusParams = {
    sha: buildSha,
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Bundle Sizes', projectName])
  };

  const readStats2 = () => effects.readStats(statsFilepath);

  return effects.postPendingPrStatus(prStatusParams)
    .chain(readStats2)
    .map(bundleSizesFromWebpackStats)
    .chain(bundleSizes =>
      makeArtifactDirectory2()
        .chain(() => writeBundleSizes2(bundleSizes))
        .chain(() => retrieveBaseBundleSizes2())
        .map(baseBundleSizes =>
          createBundleDiff({bundleSizes, baseBundleSizes})
        ).map(bundleDiffs =>
          getThresholdFailures2(bundleDiffs).cata(
            R.identity,
            thresholdFailures => ({bundleDiffs, thresholdFailures})
          )
        ).chain(({bundleDiffs, thresholdFailures}) =>
          writeBundleDiff2({bundleDiffs, thresholdFailures})
            .chain(() =>
              effects.postFinalPrStatus({
                bundleDiffs,
                thresholdFailures,
                ...prStatusParams
              })
            )
        )
    );
};
