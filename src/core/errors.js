import {sprintf} from 'sprintf-js';

export const Err = messageTemplate => (...args) => ({
  message: sprintf(messageTemplate, ...args),
  constructor: Err
});

/* eslint-disable max-len */
export const InvalidFailureThresholdOptionErr = Err("failure-thresholds' option is invalid. Problem(s):\n%s");

export const InvalidFailureThresholdErr = Err('Invalid failure threshold provided. No targets found for target: [%s]');

export const FilepathNotFoundInStatsErr = Err('Could not find %s listed in given webpack stats!');

export const StatsFileReadErr = Err('Error reading stats file: %s!');

export const ErrorCreatingArtifactDirectoryErr = Err('Error creating artifact directory: %s');

export const ErrorWritingBundleSizeArtifactErr = Err('Error writing bundle size artifact: %s');

export const ErrorWritingBundleDiffArtifactErr = Err('Error writing bundle diff artifact: %s!');

export const MissingEnvVarErr = Err('Environment variable %s is required!');

export const MissingCliOptionErr = Err("'%s' option is required!");

export const CliOptionInvalidJsonErr = Err("'%s' option is not valid JSON!");

export const CircleCiFetchErr = Err('Error making request to CircleCI %s: %s');

export const CircleCiInvalidResponseErr = Err('Error making request to CircleCI %s: %s');

export const GitHubFetchErr = Err('Error making request to GitHub %s: %s');

export const GitHubAuthorizationErr = Err('Authorization failed for request to GitHub %s. Did you provide a correct GitHub Api Token? Original response: %s');

export const GitHubInvalidResponseErr = Err('Error making request to GitHub %s: %s');

// Warnings
export const NoOpenPullRequestFoundErr = Err('No open pull request found. Skipping bundle diff step.');

export const NoRecentBuildsFoundErr = Err('No recent builds found for the base branch: %s!');

export const NoBundleSizeArtifactFoundErr = Err('No bundle size artifact found for latest build of: %s. Build number: %s');
