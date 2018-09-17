/* eslint-disable no-process-env */
import R from 'ramda';
import assert from 'assert';
import commandLineArgs from 'command-line-args';
import {Maybe} from 'monet';

import main from './main';
import {parseJSON} from './shared';
import ReaderPromise from './shared/reader-promise';
import {CliOptionInvalidJsonErr, MissingCliOptionErr} from './core/errors';
import circleciAdapter from './shared/ci-adapters/circleci';
import circleciArtifactStore from './shared/artifact-stores/circleci';
import {MakeGitHubRequest, readConfig} from './effects';

const {
  buildSha,
  buildUrl,
  artifactsDirectory,
  pullRequestId,
  repoOwner,
  repoName
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

export default () => readConfig(cliOptions['config-path']).map(
  ({
    'manifest-path': manifestFilepath,
    'project-name': projectName,
    'failure-thresholds': failureThresholds,
    'output-directory': outputDirectory
  }) => ({
    manifestFilepath,
    projectName,
    failureThresholds,
    outputDirectory
  })
).mapErr(() => {
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
}).chain(
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
      artifactStore: circleciArtifactStore({
        circleApiToken: process.env.CIRCLE_API_TOKEN,
        repoOwner,
        repoName
      }),
      ...config
    })
  )
);
