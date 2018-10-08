import R from 'ramda';
import assert from 'assert';
import commandLineArgs from 'command-line-args';
import {Maybe} from 'monet';

import main from './main';
import {parseJSON} from './shared';
import {CliOptionInvalidJsonErr, MissingCliOptionErr} from './core/errors';
import CircleciAdapter from './shared/ci-adapters/circleci';
import {readConfig} from './effects';
import {DFAULT_FAILURE_THRESHOLD_STRATEGY} from './core/schemas';

const {buildSha, buildUrl, artifactsDirectory, pullRequestId} =
  CircleciAdapter().getEnvVars();

const optionDefinitions = [
  {name: 'manifest-path'},
  {name: 'project-name'},
  {name: 'failure-thresholds', defaultValue: '[]'},
  {name: 'output-directory', defaultValue: ''},
  {name: 'config-path', defaultValue: './.threshrc.toml'}
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
  }) => main({
    manifestFilepath,
    projectName: Maybe.fromNull(projectName),
    outputDirectory,
    pullRequestId,
    failureThresholds: failureThresholds.map(
      threshold => ({strategy: DFAULT_FAILURE_THRESHOLD_STRATEGY, ...threshold})
    ),
    buildSha,
    buildUrl,
    artifactsDirectory
  })
);
