import {
  BUNDLE_SIZES_DIFF_FILENAME,
  BUNDLE_SIZES_FILENAME,
  JSON_OUTPUT_SPACING,
  OUTPUT_FILEPATH
} from './constants';
import R from 'ramda';
import {
  bundleSizesFromWebpackStats,
  diffBundles,
  getThresholdFailures
} from './bundle-size-utils';
import {
  compactAndJoin,
  readFileSync,
  writeFileSync,
  mkdirpSync,
  isError,
  parseJSON
} from './util';
import path from 'path';
import postPrStatus from './post-pr-status';
import retrieveBaseBundleSizes from './retrieve-base-bundle-sizes';

export default async opts => {
  const {
    statsFilepath,
    projectName = '',
    failureThresholds,
    repoOwner,
    repoName,
    githubApiToken,
    circleApiToken,
    buildSha,
    buildUrl,
    pullRequestId,
    artifactsDirectory
  } = opts;

  const buildArtifactFilepath = filename =>
    path.resolve(
      artifactsDirectory,
      projectName,
      filename
    );
  const fileContents = R.pipe(readFileSync, parseJSON)(statsFilepath);
  if(isError(fileContents)) {
    throw new Error(`Error reading stats file: ${fileContents}!`);
  }

  const bundleSizes = bundleSizesFromWebpackStats(fileContents);
  const mkdirResponse = mkdirpSync(buildArtifactFilepath(OUTPUT_FILEPATH));
  if(isError(mkdirResponse)) {
    throw new Error(
      `Error creating artifact directory: ${mkdirResponse.message}`
    );
  }

  const fileWriteError = writeFileSync(
    buildArtifactFilepath(BUNDLE_SIZES_FILENAME),
    JSON.stringify(bundleSizes, null, JSON_OUTPUT_SPACING)
  );
  if(isError(fileWriteError)) {
    throw new Error(
      `Error writing bundle size artifact: ${fileWriteError.message}`
    );
  }

  if(!pullRequestId) {
    return null;
  }

  const baseBundleSizes = await retrieveBaseBundleSizes({
    pullRequestId,
    repoOwner,
    repoName,
    githubApiToken,
    circleApiToken,
    bundleSizesFilepath: path.join(projectName, BUNDLE_SIZES_FILENAME)
  });

  const bundleDiffs = diffBundles({
    current: bundleSizes,
    original: baseBundleSizes
  });

  const thresholdFailures = getThresholdFailures({
    failureThresholds,
    assetStats: R.pipe(
      R.toPairs,
      R.map(([filename, {current: size}]) => ({filename, size}))
    )(bundleDiffs)
  });

  console.log(thresholdFailures, 'failures');
  console.log(bundleDiffs, 'bundleDiffs');

  const writeBundleDiffError = writeFileSync(
    buildArtifactFilepath(BUNDLE_SIZES_DIFF_FILENAME),
    JSON.stringify(
      {diffs: bundleDiffs, failures: thresholdFailures},
      null,
      JSON_OUTPUT_SPACING
    )
  );
  if(isError(writeBundleDiffError)) {
    throw new Error(
      `Error  writing bundle diff artifact: ${writeBundleDiffError.message}!`
    );
  }

  return postPrStatus({
    repoOwner,
    repoName,
    githubApiToken,
    bundleDiffs,
    thresholdFailures,
    sha: buildSha,
    targetUrl: `${buildUrl}#artifacts`,
    label: compactAndJoin(': ', ['Bundle Sizes', projectName])
  });
};
