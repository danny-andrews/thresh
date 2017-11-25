import {sprintf} from 'sprintf-js';

export const Err = messageTemplate => (...args) => ({
  message: sprintf(messageTemplate, ...args),
  constructor: Err
});

/* eslint-disable max-len */
export const InvalidFailureThresholdOptionErr = Err("failure-thresholds' option is invalid! Problem(s):\n%s");

export const InvalidFailureThresholdErr = Err('Invalid failure threshold provided. No targets found for target: [%s]');

export const FilepathNotFoundInStatsErr = Err('Could not find %s listed in given webpack stats!');

export const StatsFileReadErr = Err('Error reading stats file: %s!');

export const ErrorCreatingArtifactDirectoryErr = Err('Error creating artifact directory: %s');

export const ErrorWritingBundleSizeArtifactErr = Err('Error writing bundle size artifact: %s');

export const ErrorWritingBundleDiffArtifactErr = Err('Error writing bundle diff artifact: %s!');

export const NoOpenPullRequestFoundErr = Err('No open pull request found. Skipping bundle diff step.');
