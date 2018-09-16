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
import CircleciAdapter from './shared/ci-adapters/circleci';
import CircleciArtifactStore from './shared/artifact-stores/circleci';
import {MakeGitHubRequest} from './effects';
import ReaderPromise from './shared/reader-promise';

const {
  buildSha,
  buildUrl,
  artifactsDirectory,
  repoOwner,
  repoName,
  pullRequestId
} = CircleciAdapter().getEnvVars();

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

export const thingy = () => readFile(cliOptions['config-path'])
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
    }) => ReaderPromise.fromReaderFn(
      config => main({
        manifestFilepath,
        projectName: Maybe.fromNull(projectName),
        outputDirectory,
        pullRequestId,
        failureThresholds,
        buildSha,
        buildUrl,
        artifactsDirectory
      }).run({
        makeGitHubRequest: MakeGitHubRequest({
          githubApiToken: process.env.GITHUB_API_TOKEN,
          repoOwner,
          repoName
        }),
        artifactStore: CircleciArtifactStore({
          circleApiToken: process.env.CIRCLE_API_TOKEN,
          repoOwner,
          repoName
        }),
        ...config
      })
    )
  );

thingy().then(program => program.run({
  writeFile,
  readFile,
  resolve: path.resolve,
  request,
  db: Database('my.db'),
  mkdir,
  getFileStats,
  logMessage: console.log, // eslint-disable-line no-console
  logError: console.error // eslint-disable-line no-console
})).catch(err => {
  console.error(err); // eslint-disable-line no-console
  process.exit(1); // eslint-disable-line no-process-exit
});
