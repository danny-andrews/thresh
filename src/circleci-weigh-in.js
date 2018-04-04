import R from 'ramda';
import {Either} from 'monet';
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
  retrieveAssetSizes,
  writeAssetDiffs,
  writeAssetStats,
  getAssetFileStats,
  saveStats
} from './effects';

const warningTypes = [
  NoOpenPullRequestFoundErr,
  NoRecentBuildsFoundErr,
  NoAssetStatsArtifactFoundErr
];

const isWarningType = err =>
  R.any(Type => err.constructor === Type, warningTypes);

const circleCiWeighInUnchecked = opts => {
  const {
    manifestFilepath,
    outputDirectory,
    projectName,
    prStatusParams,
    pullRequestId,
    artifactsDirectory,
    effects = {
      retrieveAssetSizes,
      postFinalPrStatus,
      postPendingPrStatus,
      postErrorPrStatus,
      readManifest,
      makeArtifactDirectory,
      writeAssetStats,
      writeAssetDiffs,
      getAssetFileStats,
      saveStats
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

  const retrieveAssetSizes2 = () =>
    pullRequestId.toEither().cata(
      R.pipe(NoOpenPullRequestFoundErr, Either.Left, ReaderPromise.of),
      prId => effects.retrieveAssetSizes({
        pullRequestId: prId,
        assetSizesFilepath: ASSET_STATS_FILENAME
      })
    );

  const assetStatListToMap = assetStats => R.reduce(
    (acc, {filename, ...rest}) => ({...acc, [filename]: rest}),
    {},
    assetStats
  );

  const assetStatMapToList = R.pipe(
    R.toPairs,
    R.map(
      ([filename, filepath]) => ({
        filename,
        path: filepath
      })
    )
  );

  const resolvePath = ({path, ...rest}) => ({
    ...rest,
    path: [outputDirectory, path].join('/')
  });

  return ReaderPromise.fromReaderFn(
    async config => {
      const [,, currentAssetStats, previousAssetSizes] = await Promise.all([
        effects.postPendingPrStatus(prStatusParams).run(config),
        effects.makeArtifactDirectory({rootPath: artifactsDirectory})
          .run(config),
        effects.readManifest(manifestFilepath)
          .map(assetStatMapToList)
          .map(R.map(resolvePath))
          .chain(effects.getAssetFileStats)
          .map(assetStatListToMap)
          .run(config),
        retrieveAssetSizes2().run(config)
      ]);

      // TODO: Use polymorphism to eliminate unsemantic branching off
      // projectName. Also, use some semantic variable like isMonorepo.
      const assetStats = await projectName.toEither().cata(
        () => Promise.resolve(currentAssetStats),
        () => effects.saveStats({
          ...(previousAssetSizes.isRight() ? previousAssetSizes.right() : {}),
          [projectName.some()]: currentAssetStats
        }).run(config)
      );

      const writeAssetStats2 = effects.writeAssetStats({
        rootPath: artifactsDirectory,
        assetStats
      }).run(config);
      if(previousAssetSizes.isLeft()) {
        return writeAssetStats2.then(
          () => Promise.reject(previousAssetSizes.left())
        );
      }

      const assetDiffs = diffAssets({
        current: projectName.isSome()
          ? assetStats[projectName.some()]
          : assetStats,
        original: projectName.isSome()
          ? previousAssetSizes.right()[projectName.some()]
          : previousAssetSizes.right()
      });

      const thresholdFailures = getThresholdFailures({
        failureThresholds,
        assetStats: R.pipe(
          R.toPairs,
          R.map(([filepath, {current: size}]) => ({filepath, size}))
        )(assetDiffs)
      });

      if(thresholdFailures.isLeft()) {
        return writeAssetStats2.then(
          () => Promise.reject(thresholdFailures.left())
        );
      }

      return Promise.all([
        writeAssetStats2,
        effects.writeAssetDiffs({
          rootPath: artifactsDirectory,
          assetDiffs,
          thresholdFailures: thresholdFailures.right()
        }).run(config),
        effects.postFinalPrStatus({
          ...prStatusParams,
          assetDiffs,
          thresholdFailures: thresholdFailures.right()
        }).run(config)
      ]);
    }
  );
};

export default opts => {
  const prStatusParams = {
    sha: opts.buildSha,
    targetUrl: `${opts.buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Asset Sizes', opts.projectName.orSome(null)])
  };

  return ReaderPromise.fromReaderFn(
    config => circleCiWeighInUnchecked({...opts, prStatusParams}).run(config).catch(err => {
      const logError = () => config.logError(err.message);
      opts.effects.postErrorPrStatus({
        ...prStatusParams,
        description: err.message
      })
        .run(config)
        .catch(logError);

      if(isWarningType(err)) {
        config.logMessage(err.message);

        return Promise.resolve(err);
      }

      logError(err);

      return Promise.reject(err);
    })
  );
};
