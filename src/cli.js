import {isNil, last} from 'ramda';
import assert from 'assert';
import circleciWeighIn from './circleci-weigh-in';
import commandLineArgs from 'command-line-args';
import path from 'path';
import fetch from 'node-fetch';
import {
  failureThresholdListSchema,
  DFAULT_FAILURE_THRESHOLD_STRATEGY
} from './core/schemas';
import {
  SchemaValidator,
  parseJSON,
  mkdir,
  writeFile,
  readFile
} from './shared';
import {InvalidFailureThresholdOptionErr} from './core/errors';
import {Maybe} from 'monet';

const requiredEnvVariables = [
  'CIRCLE_ARTIFACTS',
  'CIRCLE_PROJECT_USERNAME',
  'CIRCLE_PROJECT_REPONAME',
  'CIRCLE_SHA1',
  'CIRCLE_BUILD_URL',
  'GITHUB_API_TOKEN',
  'CIRCLE_API_TOKEN'
];
const optionDefinitions = [
  {name: 'stats-filepath', type: String},
  {name: 'project-name', type: String},
  {name: 'failure-thresholds', type: String}
];

requiredEnvVariables.forEach(variable =>
  assert(
    process.env[variable],
    `Environment variable ${variable} is required!`
  )
);

const {
  'stats-filepath': statsFilepath,
  'project-name': projectName,
  'failure-thresholds': failureThresholdsString
} = commandLineArgs(optionDefinitions);

assert(!isNil(statsFilepath), "'stats-filepath' option is required!");

const failureThresholds = isNil(failureThresholdsString)
  ? []
  : parseJSON(failureThresholdsString);
assert(
  failureThresholds.isRight(),
  "'failure-thresholds' option is not valid JSON!"
);

const validator = SchemaValidator();
const isfailureThresholdsValid = validator.validate(
  failureThresholdListSchema,
  failureThresholds.right()
);

if(!isfailureThresholdsValid) {
  const validationMessage = validator.errorsText(
    validator.errors,
    {separator: '\n'}
  );
  throw InvalidFailureThresholdOptionErr(validationMessage);
}

const decoratedFailureThresholds = failureThresholds.right().map(
  threshold => ({
    strategy: DFAULT_FAILURE_THRESHOLD_STRATEGY,
    ...threshold
  })
);

const pullRequestId = process.env.CI_PULL_REQUEST
  && last(process.env.CI_PULL_REQUEST.split('/'));

circleciWeighIn({
  statsFilepath,
  projectName,
  pullRequestId: Maybe.fromNull(pullRequestId),
  failureThresholds: decoratedFailureThresholds,
  buildSha: process.env.CIRCLE_SHA1,
  buildUrl: process.env.CIRCLE_BUILD_URL,
  artifactsDirectory: process.env.CIRCLE_ARTIFACTS
}).run({
  writeFile,
  readFile,
  resolve: path.resolve,
  request: fetch,
  mkdir,
  repoOwner: process.env.CIRCLE_PROJECT_USERNAME,
  repoName: process.env.CIRCLE_PROJECT_REPONAME,
  githubApiToken: process.env.GITHUB_API_TOKEN,
  circleApiToken: process.env.CIRCLE_API_TOKEN
});
