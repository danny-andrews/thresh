import {
  BUNDLE_SIZES_DIFF_FILEPATH,
  BUNDLE_SIZES_FILEPATH,
  OUTPUT_FILEPATH
} from './constants';
import {bundleSizesFromWebpackStats, diffBundles} from './bundle-size-utils';
import assert from 'assert';
import commandLineArgs from 'command-line-args';
import jsonfile from 'jsonfile';
import {last} from 'ramda';
import mkdirp from 'mkdirp';
import path from 'path';
import postPrStatus from './post-pr-status';
import promisify from 'es6-promisify';
import retrieveBaseBundleSizes from './retrieve-base-bundle-sizes';

const readFile = promisify(jsonfile.readFile);
const writeFile = promisify(jsonfile.writeFile);

const FAILURE_THRESHOLD_DEFAULT = 5.00;
const JSON_OUTPUT_SPACING = 2;
const REQUIRED_ENV_VARIABLES = [
  'CIRCLE_ARTIFACTS',
  'CIRCLE_PROJECT_USERNAME',
  'CIRCLE_PROJECT_REPONAME',
  'CIRCLE_SHA1',
  'CIRCLE_BUILD_URL',
  'GITHUB_API_TOKEN',
  'CIRCLE_API_TOKEN'
];
const OPTION_DEFINITIONS = [
  {name: 'stats-filepath', type: String},
  {
    name: 'failure-threshold',
    type: Number,
    defaultValue: FAILURE_THRESHOLD_DEFAULT
  }
];

REQUIRED_ENV_VARIABLES.forEach(variable =>
  assert(
    process.env[variable],
    `Environment variable ${variable} is required!`
  )
);

const buildArtifactFilepath = filepath => path.resolve(
  process.env.CIRCLE_ARTIFACTS,
  filepath
);

let bundleSizes = null;

const {
  'stats-filepath': statsFilepath,
  'failure-threshold': failureThreshold
} = commandLineArgs(OPTION_DEFINITIONS);

assert(statsFilepath, "'stats-filepath' option is required!");

readFile(statsFilepath).catch(e => {
  throw new Error(`Error reading stats file: ${e}!`);
})
  .then(fileContents => {
    bundleSizes = bundleSizesFromWebpackStats(fileContents);

    try {
      mkdirp.sync(buildArtifactFilepath(OUTPUT_FILEPATH));
    } catch(e) {
      throw new Error(`Error creating artifact directory: ${e}!`);
    }

    return writeFile(
      buildArtifactFilepath(BUNDLE_SIZES_FILEPATH),
      bundleSizes,
      {spaces: JSON_OUTPUT_SPACING}
    )
      .then(Promise.resolve(bundleSizes))
      .catch(e => {
        throw new Error(`Error writing bundle size artifact: ${e}!`);
      });
  })
  .then(() =>
    retrieveBaseBundleSizes({
      pullRequestId: last(process.env.CI_PULL_REQUEST.split('/')),
      repoOwner: process.env.CIRCLE_PROJECT_USERNAME,
      repoName: process.env.CIRCLE_PROJECT_REPONAME,
      githubApiToken: process.env.GITHUB_API_TOKEN,
      circleApiToken: process.env.CIRCLE_API_TOKEN
    })
  )
  .then(baseBundleSize => {
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
        sha: process.env.CIRCLE_SHA1,
        repoOwner: process.env.CIRCLE_PROJECT_USERNAME,
        repoName: process.env.CIRCLE_PROJECT_REPONAME,
        githubApiToken: process.env.GITHUB_API_TOKEN,
        targetUrl: `${process.env.CIRCLE_BUILD_URL}#artifacts`,
        bundleDiffs,
        failureThreshold,
        label: 'Bundle Sizes'
      })
    ]);
  })
  .catch(e => console.error(e.stack));
