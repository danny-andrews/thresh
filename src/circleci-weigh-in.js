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
  NoAssetStatsArtifactFoundErr,
  NoPreviousStatsFoundForFilepath
} from './core/errors';
import ReaderPromise from './shared/reader-promise';
import {failureThresholdListSchema, DFAULT_FAILURE_THRESHOLD_STRATEGY}
  from './core/schemas';

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
    circleApiToken,
    githubApiToken,
    repoOwner,
    repoName
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
    return validator.errorsText(validator.errors, {separator: '\n'})
      |> InvalidFailureThresholdOptionErr
      |> ReaderPromise.fromError;
  }

  return ReaderPromise.fromReaderFn(
    async config => {
      const retrieveAssetSizes2 = () =>
        pullRequestId.toEither().cata(
          a => NoOpenPullRequestFoundErr(a) |> Either.Left |> ReaderPromise.of,
          prId => config.effects.retrieveAssetSizes({
            pullRequestId: prId,
            assetSizesFilepath: ASSET_STATS_FILENAME,
            circleApiToken,
            githubApiToken,
            repoOwner,
            repoName
          })
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

      const [,, currentAssetStats, previousAssetSizes] = await Promise.all([
        config.effects.postPendingPrStatus(prStatusParams).run(config),
        config.effects.makeArtifactDirectory({rootPath: artifactsDirectory})
          .run(config),
        config.effects.readManifest(manifestFilepath)
          .map(assetStatMapToList)
          .map(R.map(resolvePath))
          .chain(config.effects.getAssetFileStats)
          .map(assetStatListToMap)
          .run(config),
        retrieveAssetSizes2().run(config)
      ]);

      // TODO: Use polymorphism to eliminate unsemantic branching off
      // projectName. Also, use some semantic variable like isMonorepo.
      const assetStats = await projectName.toEither().cata(
        () => Promise.resolve(currentAssetStats),
        () => config.effects.saveStats({
          ...(previousAssetSizes.isRight() ? previousAssetSizes.right() : {}),
          [projectName.some()]: currentAssetStats
        }).run(config)
      );

      const writeAssetStats2 = config.effects.writeAssetStats({
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
          : previousAssetSizes.right(),
        onMismatchFound: filepath =>
          config.logMessage(NoPreviousStatsFoundForFilepath(filepath).message)
      });

      const thresholdFailures = getThresholdFailures({
        failureThresholds,
        assetStats: assetDiffs
          |> R.toPairs
          |> R.map(([filepath, {current: size}]) => ({filepath, size}))
      });

      if(thresholdFailures.isLeft()) {
        return writeAssetStats2.then(
          () => Promise.reject(thresholdFailures.left())
        );
      }

      return Promise.all([
        writeAssetStats2,
        config.effects.writeAssetDiffs({
          rootPath: artifactsDirectory,
          assetDiffs,
          thresholdFailures: thresholdFailures.right()
        }).run(config),
        config.effects.postFinalPrStatus({
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
    targetUrl: `${opts.buildUrl}#artifacts`,
    label: compactAndJoin(': ', [
      'Asset Sizes',
      opts.projectName.orSome(null)
    ]),
    sha: opts.buildSha,
    ...R.pick(['githubApiToken', 'repoOwner', 'repoName'])
  };

  return ReaderPromise.fromReaderFn(
    config => circleCiWeighInUnchecked({prStatusParams, ...opts})
      .run(config)
      .catch(err => {
        const logError = () => config.logError(err.message);
        config.effects.postErrorPrStatus({
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
