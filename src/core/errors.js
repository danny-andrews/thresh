import {sprintf} from 'sprintf-js';

/* eslint-disable max-len */
export const InvalidFailureThresholdOptionErr = (...args) => ({
  message: sprintf("failure-thresholds' option is invalid. Problem(s):\n%s", ...args),
  constructor: InvalidFailureThresholdOptionErr
});

export const InvalidFailureThresholdErr = (...args) => ({
  message: sprintf('Invalid failure threshold provided. No targets found for target: [%s]', ...args),
  constructor: InvalidFailureThresholdErr
});

export const ManifestFileReadErr = (...args) => ({
  message: sprintf('Error reading manifest file: %s!', ...args),
  constructor: ManifestFileReadErr
});

export const ErrorCreatingArtifactDirectoryErr = (...args) => ({
  message: sprintf('Error creating artifact directory: %s', ...args),
  constructor: ErrorCreatingArtifactDirectoryErr
});

export const ErrorWritingAssetSizesArtifactErr = (...args) => ({
  message: sprintf('Error writing asset sizes artifact: %s', ...args),
  constructor: ErrorWritingAssetSizesArtifactErr
});

export const ErrorWritingAssetDiffsArtifactErr = (...args) => ({
  message: sprintf('Error writing asset diffs artifact: %s!', ...args),
  constructor: ErrorWritingAssetDiffsArtifactErr
});

export const MissingEnvVarErr = (...args) => ({
  message: sprintf('Environment variable %s is required!', ...args),
  constructor: MissingEnvVarErr
});

export const MissingCliOptionErr = (...args) => ({
  message: sprintf("'%s' option is required!", ...args),
  constructor: MissingCliOptionErr
});

export const CliOptionInvalidJsonErr = (...args) => ({
  message: sprintf("'%s' option is not valid JSON!", ...args),
  constructor: CliOptionInvalidJsonErr
});

export const CircleCiFetchErr = (...args) => ({
  message: sprintf('Error making request to CircleCI %s: %s', ...args),
  constructor: CircleCiFetchErr
});

export const CircleCiInvalidResponseErr = (...args) => ({
  message: sprintf('Error making request to CircleCI %s: %s', ...args),
  constructor: CircleCiInvalidResponseErr
});

export const GitHubFetchErr = (...args) => ({
  message: sprintf('Error making request to GitHub %s: %s', ...args),
  constructor: GitHubFetchErr
});

export const GitHubAuthorizationErr = (...args) => ({
  message: sprintf('Authorization failed for request to GitHub %s. Did you provide a correct GitHub Api Token? Original response: %s', ...args),
  constructor: GitHubAuthorizationErr
});

export const GitHubInvalidResponseErr = (...args) => ({
  message: sprintf('Error making request to GitHub %s: %s', ...args),
  constructor: GitHubInvalidResponseErr
});

export const NoOpenPullRequestFoundErr = (...args) => ({
  message: sprintf('No open pull request found. Skipping asset diff step.', ...args),
  constructor: NoOpenPullRequestFoundErr
});

export const NoRecentBuildsFoundErr = (...args) => ({
  message: sprintf('No recent builds found for the base branch: %s!', ...args),
  constructor: NoRecentBuildsFoundErr
});

export const NoAssetStatsArtifactFoundErr = (...args) => ({
  message: sprintf('No asset stats artifact found for latest build of: %s. Build number: %s', ...args),
  constructor: NoAssetStatsArtifactFoundErr
});

export const NoPreviousStatsFoundForFilepath = (...args) => ({
  message: sprintf('No previous stats found for %s. Did you rename that file recently?', ...args),
  constructor: NoPreviousStatsFoundForFilepath
});
