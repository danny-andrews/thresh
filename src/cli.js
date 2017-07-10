import assert from 'assert';
import circleciWeighIn from './';
import commandLineArgs from 'command-line-args';
import {last} from 'ramda';

const FAILURE_THRESHOLD_DEFAULT = 5.00;
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

const {
  'stats-filepath': statsFilepath,
  'failure-threshold': failureThreshold
} = commandLineArgs(OPTION_DEFINITIONS);

assert(statsFilepath, "'stats-filepath' option is required!");

const pullRequestId = process.env.CI_PULL_REQUEST
  && last(process.env.CI_PULL_REQUEST.split('/'));

circleciWeighIn({
  statsFilepath,
  failureThreshold,
  repoOwner: process.env.CIRCLE_PROJECT_USERNAME,
  repoName: process.env.CIRCLE_PROJECT_REPONAME,
  githubApiToken: process.env.GITHUB_API_TOKEN,
  circleApiToken: process.env.CIRCLE_API_TOKEN,
  buildSha: process.env.CIRCLE_SHA1,
  buildUrl: process.env.CIRCLE_BUILD_URL,
  pullRequestId,
  artifactsDirectory: process.env.CIRCLE_ARTIFACTS
})
  .catch(e => console.error(e.stack));
