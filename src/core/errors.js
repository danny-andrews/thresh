import {sprintf} from 'sprintf-js';

export const Err = ({messageTemplate, constructor}) => (...args) => {
  const message = sprintf(messageTemplate, ...args);

  return ({
    message,
    constructor,
    show: () => message
  });
};

/* eslint-disable max-len, no-use-before-define */
export const InvalidFailureThresholdOptionErr = Err({
  messageTemplate: "failure-thresholds' option is invalid. Problem(s):\n%s",
  constructor: InvalidFailureThresholdOptionErr
});

export const InvalidFailureThresholdErr = Err({
  messageTemplate: 'Invalid failure threshold provided. No targets found for target: [%s]',
  constructor: InvalidFailureThresholdErr
});

export const FilepathNotFoundInStatsErr = Err({
  messageTemplate: 'Could not find %s listed in given webpack stats!',
  constructor: FilepathNotFoundInStatsErr
});

export const StatsFileReadErr = Err({
  messageTemplate: 'Error reading stats file: %s!',
  constructor: StatsFileReadErr
});

export const ErrorCreatingArtifactDirectoryErr = Err({
  messageTemplate: 'Error creating artifact directory: %s',
  constructor: ErrorCreatingArtifactDirectoryErr
});

export const ErrorWritingBundleSizeArtifactErr = Err({
  messageTemplate: 'Error writing bundle size artifact: %s',
  constructor: ErrorWritingBundleSizeArtifactErr
});

export const ErrorWritingBundleDiffArtifactErr = Err({
  messageTemplate: 'Error writing bundle diff artifact: %s!',
  constructor: ErrorWritingBundleDiffArtifactErr
});

export const MissingEnvVarErr = Err({
  messageTemplate: 'Environment variable %s is required!',
  constructor: MissingEnvVarErr
});

export const MissingCliOptionErr = Err({
  messageTemplate: "'%s' option is required!",
  constructor: MissingCliOptionErr
});

export const CliOptionInvalidJsonErr = Err({
  messageTemplate: "'%s' option is not valid JSON!",
  constructor: CliOptionInvalidJsonErr
});

export const CircleCiFetchErr = Err({
  messageTemplate: 'Error making request to CircleCI %s: %s',
  constructor: CircleCiFetchErr
});

export const CircleCiInvalidResponseErr = Err({
  messageTemplate: 'Error making request to CircleCI %s: %s',
  constructor: CircleCiInvalidResponseErr
});

export const GitHubFetchErr = Err({
  messageTemplate: 'Error making request to GitHub %s: %s',
  constructor: GitHubFetchErr
});

export const GitHubAuthorizationErr = Err({
  messageTemplate: 'Authorization failed for request to GitHub %s. Did you provide a correct GitHub Api Token? Original response: %s',
  constructor: GitHubAuthorizationErr
});

export const GitHubInvalidResponseErr = Err({
  messageTemplate: 'Error making request to GitHub %s: %s',
  constructor: GitHubInvalidResponseErr
});

export const NoOpenPullRequestFoundErr = Err({
  messageTemplate: 'No open pull request found. Skipping bundle diff step.',
  constructor: NoOpenPullRequestFoundErr
});

export const NoRecentBuildsFoundErr = Err({
  messageTemplate: 'No recent builds found for the base branch: %s!',
  constructor: NoRecentBuildsFoundErr
});

export const NoBundleSizeArtifactFoundErr = Err({
  messageTemplate: 'No bundle size artifact found for latest build of: %s. Build number: %s',
  constructor: NoBundleSizeArtifactFoundErr
});
