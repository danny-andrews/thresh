import R from 'ramda';
import assert from 'assert';
import commandLineArgs from 'command-line-args';
import {Maybe} from 'monet';
import main from './main';
import {parseJSON, parseTOML, readFile} from './shared';
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

requiredEnvVariables.forEach(variable =>
  assert(process.env[variable], MissingEnvVarErr(variable).message)
);

const pullRequestId = process.env.CI_PULL_REQUEST
    && R.last(process.env.CI_PULL_REQUEST.split('/'));

const optionDefinitions = [
  {name: 'manifest-path'},
  {name: 'project-name'},
  {name: 'failure-thresholds', defaultValue: '[]'},
  {name: 'output-directory', defaultValue: ''},
  {
    name: 'config-path',
    defaultValue: './circleci-weigh-in-rc.toml'
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
      !R.isNil(manifestFilepath),
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
  .then(({
    manifestFilepath,
    projectName,
    outputDirectory,
    failureThresholds
  }) =>
    main({
      manifestFilepath,
      projectName: Maybe.fromNull(projectName),
      outputDirectory,
      pullRequestId: Maybe.fromNull(pullRequestId),
      failureThresholds,
      buildSha: process.env.CIRCLE_SHA1,
      buildUrl: process.env.CIRCLE_BUILD_URL,
      artifactsDirectory: process.env.CIRCLE_ARTIFACTS
    })
  )
  .catch(err => {
    // Catchall in case our error logging logic has an error. :D
    console.error(err); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line no-process-exit
  });
