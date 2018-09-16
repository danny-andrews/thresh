/* eslint-disable no-process-env */
import R from 'ramda';
import assert from 'assert';
import commandLineArgs from 'command-line-args';
import {Maybe} from 'monet';
import path from 'path';

import main from './main';
import {
  parseJSON,
  parseTOML,
  readFile,
  mkdir,
  writeFile,
  getFileStats,
  Database,
  request
} from './shared';
import {CliOptionInvalidJsonErr, MissingCliOptionErr} from './core/errors';
import circleciAdapter from './shared/ci-adapters/circleci';
import circleciArtifactStore from './shared/artifact-stores/circleci';
import {MakeGitHubRequest} from './effects';

const {
  buildSha,
  buildUrl,
  artifactsDirectory,
  repoOwner,
  repoName,
  pullRequestId
} = circleciAdapter().getEnvVars();

const optionDefinitions = [
  {name: 'manifest-path'},
  {name: 'project-name'},
  {name: 'failure-thresholds', defaultValue: '[]'},
  {name: 'output-directory', defaultValue: ''},
  {
    name: 'config-path',
    defaultValue: './.threshrc.toml'
  }
];

const cliOptions = commandLineArgs(optionDefinitions);

readFile(cliOptions['config-path'])
  .then(parseTOML)
  .then(config => config.right())
  .then(({
    'manifest-path': manifestFilepath,
    'project-name': projectName,
    'failure-thresholds': failureThresholds,
    'output-directory': outputDirectory
  }) => ({
    manifestFilepath,
    projectName,
    failureThresholds,
    outputDirectory
  }))
  .catch(() => {
    const {
      'manifest-path': manifestFilepath,
      'project-name': projectName,
      'failure-thresholds': failureThresholdsString,
      'output-directory': outputDirectory
    } = cliOptions;

    assert(
      R.is(String, manifestFilepath),
      MissingCliOptionErr('manifest-path').message
    );

    const failureThresholds = parseJSON(failureThresholdsString);

    assert(
      failureThresholds.isRight(),
      CliOptionInvalidJsonErr('failure-thresholds').message
    );

    return {
      manifestFilepath,
      projectName,
      failureThresholds: failureThresholds.right(),
      outputDirectory
    };
  })
  .then(
    ({
      manifestFilepath,
      projectName,
      outputDirectory,
      failureThresholds
    }) => main({
      manifestFilepath,
      projectName: Maybe.fromNull(projectName),
      outputDirectory,
      pullRequestId,
      failureThresholds,
      buildSha,
      buildUrl,
      artifactsDirectory
    }).run({
      writeFile,
      readFile,
      resolve: path.resolve,
      request,
      db: Database('my.db'),
      mkdir,
      getFileStats,
      logMessage: console.log, // eslint-disable-line no-console
      logError: console.error, // eslint-disable-line no-console
      makeGitHubRequest: MakeGitHubRequest({
        githubApiToken: process.env.GITHUB_API_TOKEN,
        repoOwner,
        repoName
      }),
      artifactStore: circleciArtifactStore({
        circleApiToken: process.env.CIRCLE_API_TOKEN,
        repoOwner,
        repoName
      })
    })
  )
  .catch(err => {
    console.error(err); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line no-process-exit
  });
