import R from 'ramda';
import path from 'path';
import {BUNDLE_SIZES_FILENAME} from './core/constants';
import bundleSizesFromWebpackStats
  from './core/bundle-sizes-from-webpack-stats';
import diffBundles from './core/diff-bundles';
import getThresholdFailures from './core/get-threshold-failures';
import {compactAndJoin, SchemaValidator} from './shared';
import {
  NoOpenPullRequestFoundErr,
  InvalidFailureThresholdOptionErr,
  NoRecentBuildsFoundErr,
  NoBundleSizeArtifactFoundErr
} from './core/errors';
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

const warningTypes = [
  NoOpenPullRequestFoundErr,
  NoRecentBuildsFoundErr,
  NoBundleSizeArtifactFoundErr
];

const isWarningType = err => R.any(Type => R.is(Type, err), warningTypes);

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

  const retrieveBaseBundleSizes2 = () =>
    pullRequestId.toEither().cata(
      () => ReaderPromise.fromError(NoOpenPullRequestFoundErr()),
      prId => effects.retrieveBaseBundleSizes({
        pullRequestId: prId,
        bundleSizesFilepath: path.join(projectName, BUNDLE_SIZES_FILENAME)
      })
    );

  const prStatusParams = {
    sha: buildSha,
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Bundle Sizes', projectName])
  };

  const writeArtifactParams = {
    rootPath: artifactsDirectory,
    projectName
  };

  return ReaderPromise.fromReaderFn(
    config => Promise.all([
      effects.postPendingPrStatus(prStatusParams).run(config),
      effects.makeArtifactDirectory({rootPath: artifactsDirectory, projectName})
        .run(config),
      effects.readStats(statsFilepath)
        .map(bundleSizesFromWebpackStats)
        .run(config),
      retrieveBaseBundleSizes2().run(config)
    ]).then(([,, bundleSizes, baseBundleSizes]) => {
      const bundleDiffs = diffBundles({
        current: bundleSizes,
        original: baseBundleSizes
      });

      return getThresholdFailures({
        failureThresholds,
        assetStats: R.pipe(
          R.toPairs,
          R.map(([filepath, {current: size}]) => ({filepath, size}))
        )(bundleDiffs)
      }).cata(a => Promise.reject(a), a => Promise.resolve(a))
        .then(thresholdFailures =>
          Promise.all([
            effects.writeBundleSizes({
              ...writeArtifactParams,
              bundleSizes
            }).run(config),
            effects.writeBundleDiff({
              ...writeArtifactParams,
              bundleDiffs,
              thresholdFailures
            }).run(config),
            effects.postFinalPrStatus({
              ...prStatusParams,
              bundleDiffs,
              thresholdFailures
            }).run(config)
          ])
        );
    }).catch(err => {
      if(isWarningType(err)) {
        config.logMessage(err.message);

        return Promise.resolve();
      }

      if(R.is(Error, err)) {
        config.logError(err);
      } else {
        config.logError(err.message);
      }

      return Promise.reject(err);
    })
  );
};
