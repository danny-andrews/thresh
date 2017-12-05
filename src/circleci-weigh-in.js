import R from 'ramda';
import path from 'path';
import {ASSET_STATS_FILENAME} from './core/constants';
import diffAssets from './core/diff-assets';
import getThresholdFailures from './core/get-threshold-failures';
import {compactAndJoin, SchemaValidator} from './shared';
import {
  NoOpenPullRequestFoundErr,
  InvalidFailureThresholdOptionErr,
  NoRecentBuildsFoundErr,
  NoAssetStatsArtifactFoundErr
} from './core/errors';
import ReaderPromise from './core/reader-promise';
import {failureThresholdListSchema, DFAULT_FAILURE_THRESHOLD_STRATEGY}
  from './core/schemas';
import {
  makeArtifactDirectory,
  postFinalPrStatus,
  postPendingPrStatus,
  postErrorPrStatus,
  readManifest,
  retrieveBaseAssetSizes,
  writeAssetDiffs,
  writeAssetStats
} from './effects';

const warningTypes = [
  NoOpenPullRequestFoundErr,
  NoRecentBuildsFoundErr,
  NoAssetStatsArtifactFoundErr
];

const isWarningType = err =>
  R.any(Type => err.constructor === Type, warningTypes);

export default opts => {
  const {
    manifestFilepath,
    outputDirectory,
    projectName = '',
    buildSha,
    buildUrl,
    pullRequestId,
    artifactsDirectory,
    effects = {
      retrieveBaseAssetSizes,
      postFinalPrStatus,
      postPendingPrStatus,
      postErrorPrStatus,
      readManifest,
      makeArtifactDirectory,
      writeAssetStats,
      writeAssetDiffs
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

  const retrieveBaseAssetSizes2 = () =>
    pullRequestId.toEither().cata(
      () => ReaderPromise.of(NoOpenPullRequestFoundErr()),
      prId => effects.retrieveBaseAssetSizes({
        pullRequestId: prId,
        assetSizesFilepath: path.join(projectName, ASSET_STATS_FILENAME)
      })
    );

  const prStatusParams = {
    sha: buildSha,
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Asset Sizes', projectName])
  };

  const writeArtifactParams = {
    rootPath: artifactsDirectory,
    projectName
  };

  const getAssetStatsFromManifest = manifest =>
    ReaderPromise.fromReaderFn(
      config => Promise.all(
        R.pipe(
          R.mapObjIndexed((filepath, filename) => {
            const fullPath = [outputDirectory, filepath].join('/');

            return config.getFileStats(fullPath)
              .then(({size}) => ({filename, path: fullPath, size}));
          }),
          R.values
        )(manifest)
      )
    );

  const assetStatListToMap = assetStats => R.reduce(
    (acc, {filename, ...rest}) => ({...acc, [filename]: rest}),
    {},
    assetStats
  );

  return ReaderPromise.fromReaderFn(
    config => Promise.all([
      effects.postPendingPrStatus(prStatusParams).run(config),
      effects.makeArtifactDirectory({rootPath: artifactsDirectory, projectName})
        .run(config),
      effects.readManifest(manifestFilepath)
        .chain(getAssetStatsFromManifest)
        .map(assetStatListToMap)
        .run(config),
      retrieveBaseAssetSizes2().run(config)
    ]).then(([,, assetStats, baseAssetSizes]) => {
      const writeAssetStats2 = effects.writeAssetStats({
        ...writeArtifactParams,
        assetStats
      }).run(config);
      if(isWarningType(baseAssetSizes)) {
        return writeAssetStats2.then(() => Promise.reject(baseAssetSizes));
      }

      const assetDiffs = diffAssets({
        current: assetStats,
        original: baseAssetSizes
      });

      return getThresholdFailures({
        failureThresholds,
        assetStats: R.pipe(
          R.toPairs,
          R.map(([filepath, {current: size}]) => ({filepath, size}))
        )(assetDiffs)
      }).cata(a => Promise.reject(a), a => Promise.resolve(a))
        .then(thresholdFailures =>
          Promise.all([
            writeAssetStats2,
            effects.writeAssetDiffs({
              ...writeArtifactParams,
              assetDiffs,
              thresholdFailures
            }).run(config),
            effects.postFinalPrStatus({
              ...prStatusParams,
              assetDiffs,
              thresholdFailures
            }).run(config)
          ])
        );
    }).catch(err => {
      const logError = () => config.logError(err.message);
      effects.postErrorPrStatus({...prStatusParams, description: err.message})
        .run(config).catch(logError);

      if(isWarningType(err)) {
        config.logMessage(err.message);

        return Promise.resolve();
      }

      logError(err);

      return Promise.reject();
    })
  );
};
