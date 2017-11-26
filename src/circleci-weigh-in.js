import R from 'ramda';
import path from 'path';
import {Reader} from 'monet';
import {
  BUNDLE_SIZES_DIFF_FILENAME,
  BUNDLE_SIZES_FILENAME,
  OUTPUT_FILEPATH
} from './core/constants';
import bundleSizesFromWebpackStats
  from './core/bundle-sizes-from-webpack-stats';
import diffBundles from './core/diff-bundles';
import getThresholdFailures from './core/get-threshold-failures';
import {compactAndJoin, parseJSON, serializeForFile, SchemaValidator}
  from './shared';
import postPrStatus from './post-pr-status';
import retrieveBaseBundleSizes from './retrieve-base-bundle-sizes';
import {
  StatsFileReadErr,
  ErrorWritingBundleSizeArtifactErr,
  ErrorCreatingArtifactDirectoryErr,
  ErrorWritingBundleDiffArtifactErr,
  NoOpenPullRequestFoundErr,
  InvalidFailureThresholdOptionErr
} from './core/errors';
import ReaderPromise from './core/reader-promise';
import {
  failureThresholdListSchema,
  DFAULT_FAILURE_THRESHOLD_STRATEGY
} from './core/schemas';

const readStats = statsFilepath =>
  ReaderPromise.fromReaderFn(({readFile}) =>
    readFile(statsFilepath)
      .catch(error => Promise.reject(StatsFileReadErr(error)))
      .then(contents =>
        parseJSON(contents).cata(
          error => Promise.reject(StatsFileReadErr(error)),
          R.identity
        )
      )
  );

const mkArtifactDir = filepath =>
  ReaderPromise.fromReaderFn(({mkdir}) =>
    mkdir(filepath)
      .catch(error => Promise.reject(ErrorCreatingArtifactDirectoryErr(error)))
  );

const writeBundleSizes = ({filepath, bundleSizes}) =>
  ReaderPromise.fromReaderFn(({writeFile}) =>
    writeFile(
      filepath,
      serializeForFile(bundleSizes)
    ).catch(error => Promise.reject(ErrorWritingBundleSizeArtifactErr(error)))
  );

const writeBundleDiff = ({filepath, bundleDiffs, thresholdFailures}) =>
  ReaderPromise.fromReaderFn(({writeFile}) =>
    writeFile(
      filepath,
      serializeForFile({diffs: bundleDiffs, failures: thresholdFailures})
    ).catch(error => Promise.reject(ErrorWritingBundleDiffArtifactErr(error)))
  );

export default opts => {
  const {
    statsFilepath,
    projectName = '',
    buildSha,
    buildUrl,
    pullRequestId,
    artifactsDirectory
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

  const buildArtifactFilepath = (...args) => Reader(
    ({resolve}) => R.pipe(resolve, a => Promise.resolve(a))(
      artifactsDirectory,
      OUTPUT_FILEPATH,
      projectName,
      ...args
    )
  );

  const mkArtifactDir2 = () => ReaderPromise(
    buildArtifactFilepath()
  ).chain(mkArtifactDir);

  const writeBundleSizes2 = bundleSizes =>
    ReaderPromise(buildArtifactFilepath(BUNDLE_SIZES_FILENAME))
      .chain(filepath => writeBundleSizes({filepath, bundleSizes}));

  const retrieveBaseBundleSizes2 = () => pullRequestId.toEither().cata(
    () => ReaderPromise.fromError(NoOpenPullRequestFoundErr()),
    prId => retrieveBaseBundleSizes({
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
    ReaderPromise(buildArtifactFilepath(BUNDLE_SIZES_DIFF_FILENAME))
      .chain(filepath =>
        writeBundleDiff({filepath, bundleDiffs, thresholdFailures})
      );

  const postPrStatus2 = ({bundleDiffs, thresholdFailures}) => postPrStatus({
    bundleDiffs,
    thresholdFailures,
    sha: buildSha,
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Bundle Sizes', projectName])
  });

  return readStats(statsFilepath)
    .map(bundleSizesFromWebpackStats)
    .chain(bundleSizes =>
      mkArtifactDir2()
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
              postPrStatus2({bundleDiffs, thresholdFailures})
            )
        )
    );
};
