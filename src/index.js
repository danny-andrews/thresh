import {
  BUNDLE_SIZES_DIFF_FILEPATH,
  BUNDLE_SIZES_FILEPATH,
  OUTPUT_FILEPATH
} from './constants';
import {bundleSizesFromWebpackStats, diffBundles} from './bundle-size-utils';
import {compactAndJoin} from './util';
import jsonfile from 'jsonfile';
import mkdirp from 'mkdirp';
import path from 'path';
import postPrStatus from './post-pr-status';
import promisify from 'es6-promisify';
import retrieveBaseBundleSizes from './retrieve-base-bundle-sizes';

const readFile = promisify(jsonfile.readFile);
const writeFile = promisify(jsonfile.writeFile);

const JSON_OUTPUT_SPACING = 2;

export default async opts => {
  const {
    statsFilepath,
    projectName = '',
    failureThreshold,
    repoOwner,
    repoName,
    githubApiToken,
    circleApiToken,
    buildSha,
    buildUrl,
    pullRequestId,
    artifactsDirectory
  } = opts;

  const buildArtifactFilepath = filepath => path.resolve(
    artifactsDirectory,
    projectName,
    filepath
  );

  let fileContents = null;
  try {
    fileContents = await readFile(statsFilepath);
  } catch(e) {
    throw new Error(`Error reading stats file: ${e}!`);
  }

  const bundleSizes = bundleSizesFromWebpackStats(fileContents);
  try {
    mkdirp.sync(buildArtifactFilepath(OUTPUT_FILEPATH));
  } catch(e) {
    throw new Error(`Error creating artifact directory: ${e}!`);
  }

  try {
    await writeFile(
      buildArtifactFilepath(BUNDLE_SIZES_FILEPATH),
      bundleSizes,
      {spaces: JSON_OUTPUT_SPACING}
    );
  } catch(e) {
    throw new Error(`Error writing bundle size artifact: ${e}!`);
  }

  if(!pullRequestId) {
    return null;
  }

  const baseBundleSize = await retrieveBaseBundleSizes({
    pullRequestId,
    repoOwner,
    repoName,
    githubApiToken,
    circleApiToken
  });

  const bundleDiffs = diffBundles({
    current: bundleSizes,
    original: baseBundleSize
  });

  return Promise.all([
    writeFile(
      buildArtifactFilepath(BUNDLE_SIZES_DIFF_FILEPATH),
      bundleDiffs,
      {spaces: JSON_OUTPUT_SPACING}
    ).catch(e => {
      throw new Error(`Error writing bundle diff artifact: ${e}!`);
    }),
    postPrStatus({
      sha: buildSha,
      repoOwner,
      repoName,
      githubApiToken,
      targetUrl: `${buildUrl}#artifacts`,
      bundleDiffs,
      failureThreshold,
      label: compactAndJoin(': ', ['Bundle Sizes', projectName])
    })
  ]);
};
