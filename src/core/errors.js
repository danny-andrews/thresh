import {sprintf} from 'sprintf-js';

const Err = ({messageTemplate, constructor}) => (...args) => {
  const message = sprintf(messageTemplate, ...args);

  return ({message, constructor});
};

/* eslint-disable max-len */
export const InvalidFailureThresholdOptionErr = (...args) => Err({
  messageTemplate: "failure-thresholds' option is invalid. Problem(s):\n%s",
  constructor: InvalidFailureThresholdOptionErr
})(...args);

export const InvalidFailureThresholdErr = (...args) => Err({
  messageTemplate: 'Invalid failure threshold provided. No targets found for target: [%s]',
  constructor: InvalidFailureThresholdErr
})(...args);

export const ManifestFileReadErr = (...args) => Err({
  messageTemplate: 'Error reading manifest file: %s!',
  constructor: ManifestFileReadErr
})(...args);

export const ErrorCreatingArtifactDirectoryErr = (...args) => Err({
  messageTemplate: 'Error creating artifact directory: %s',
  constructor: ErrorCreatingArtifactDirectoryErr
})(...args);

export const ErrorWritingAssetSizesArtifactErr = (...args) => Err({
  messageTemplate: 'Error writing asset sizes artifact: %s',
  constructor: ErrorWritingAssetSizesArtifactErr
})(...args);

export const ErrorWritingAssetDiffsArtifactErr = (...args) => Err({
  messageTemplate: 'Error writing asset diffs artifact: %s!',
  constructor: ErrorWritingAssetDiffsArtifactErr
})(...args);

export const MissingEnvVarErr = (...args) => Err({
  messageTemplate: 'Environment variable %s is required!',
  constructor: MissingEnvVarErr
})(...args);

export const MissingCliOptionErr = (...args) => Err({
  messageTemplate: "'%s' option is required!",
  constructor: MissingCliOptionErr
})(...args);

export const CliOptionInvalidJsonErr = (...args) => Err({
  messageTemplate: "'%s' option is not valid JSON!",
  constructor: CliOptionInvalidJsonErr
})(...args);

export const CircleCiFetchErr = (...args) => Err({
  messageTemplate: 'Error making request to CircleCI %s: %s',
  constructor: CircleCiFetchErr
})(...args);

export const CircleCiInvalidResponseErr = (...args) => Err({
  messageTemplate: 'Error making request to CircleCI %s: %s',
  constructor: CircleCiInvalidResponseErr
})(...args);

export const GitHubFetchErr = (...args) => Err({
  messageTemplate: 'Error making request to GitHub %s: %s',
  constructor: GitHubFetchErr
})(...args);

export const GitHubAuthorizationErr = (...args) => Err({
  messageTemplate: 'Authorization failed for request to GitHub %s. Did you provide a correct GitHub Api Token? Original response: %s',
  constructor: GitHubAuthorizationErr
})(...args);

export const GitHubInvalidResponseErr = (...args) => Err({
  messageTemplate: 'Error making request to GitHub %s: %s',
  constructor: GitHubInvalidResponseErr
})(...args);

export const NoOpenPullRequestFoundErr = (...args) => Err({
  messageTemplate: 'No open pull request found. Skipping asset diff step.',
  constructor: NoOpenPullRequestFoundErr
})(...args);

export const NoRecentBuildsFoundErr = (...args) => Err({
  messageTemplate: 'No recent builds found for the base branch: %s!',
  constructor: NoRecentBuildsFoundErr
})(...args);

export const NoAssetStatsArtifactFoundErr = (...args) => Err({
  messageTemplate: 'No asset stats artifact found for latest build of: %s. Build number: %s',
  constructor: NoAssetStatsArtifactFoundErr
})(...args);
