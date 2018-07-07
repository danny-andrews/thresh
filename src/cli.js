/* eslint-disable no-console */
import R from 'ramda';
import assert from 'assert';
import commandLineArgs from 'command-line-args';
import path from 'path';
import {Maybe} from 'monet';
import {parseJSON, mkdir, writeFile, readFile, getFileStats, Database, request}
  from './shared';
import circleciWeighIn from './circleci-weigh-in';
import {MissingEnvVarErr, CliOptionInvalidJsonErr, MissingCliOptionErr}
  from './core/errors';

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
  {name: 'manifest-filepath', type: String},
  {name: 'project-name', type: String},
  {name: 'failure-thresholds', type: String, defaultValue: '[]'},
  {name: 'output-directory', type: String, defaultValue: ''}
];

requiredEnvVariables.forEach(variable =>
  assert(process.env[variable], MissingEnvVarErr(variable).message)
);

const {
  'manifest-filepath': manifestFilepath,
  'project-name': projectName,
  'failure-thresholds': failureThresholdsString,
  'output-directory': outputDirectory
} = commandLineArgs(optionDefinitions);

assert(
  !R.isNil(manifestFilepath),
  MissingCliOptionErr('manifest-filepath').message
);

const failureThresholds = parseJSON(failureThresholdsString);

assert(
  failureThresholds.isRight(),
  CliOptionInvalidJsonErr('failure-thresholds').message
);

const pullRequestId = process.env.CI_PULL_REQUEST
  && R.last(process.env.CI_PULL_REQUEST.split('/'));

const main = circleciWeighIn({
  manifestFilepath,
  projectName: Maybe.fromNull(projectName),
  outputDirectory,
  pullRequestId: Maybe.fromNull(pullRequestId),
  failureThresholds: failureThresholds.right(),
  buildSha: process.env.CIRCLE_SHA1,
  buildUrl: process.env.CIRCLE_BUILD_URL,
  artifactsDirectory: process.env.CIRCLE_ARTIFACTS
});

main.run({
  writeFile,
  readFile,
  resolve: path.resolve,
  request,
  db: Database('my.db'),
  mkdir,
  getFileStats,
  repoOwner: process.env.CIRCLE_PROJECT_USERNAME,
  repoName: process.env.CIRCLE_PROJECT_REPONAME,
  githubApiToken: process.env.GITHUB_API_TOKEN,
  circleApiToken: process.env.CIRCLE_API_TOKEN,
  logMessage: console.log,
  logError: console.error
}).catch(err => {
  // Catchall in case our error logging logic has an error. :D
  console.error(err);
  process.exit(1); // eslint-disable-line no-process-exit
});
