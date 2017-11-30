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

// `Error making request to CircleCI ${finalUrl}: ${response.message}`
// `Error making request to CircleCI ${finalUrl}: ${response.statusText}`
// `Error making request to GitHub ${url}: ${response}`
// `Authorization failed for request to GitHub ${url}. Did you provide a correct GitHub Api Token? Original response: ${response.statusText}`
// `Error making request to GitHub ${url}: ${response.statusText}`

// Warnings
export const NoOpenPullRequestFoundErr = Err('No open pull request found. Skipping bundle diff step.');

// `No recent builds found for the base branch: ${baseBranch}!`
// `No bundle size artifact found for latest build of: ${baseBranch}. Build number: ${buildNumber}`
