import {CreateErrorFactory} from '@danny.andrews/fp-utils';

/* eslint-disable max-len */
export const InvalidThresholdOptionErr = CreateErrorFactory("'thresholds' option is invalid. Problem(s): %s");

export const InvalidThresholdErr = CreateErrorFactory('Invalid failure threshold provided. No files found for target(s): [%s]');

export const ManifestFileReadErr = CreateErrorFactory('Error reading manifest file');

export const ManifestFileParseErr = CreateErrorFactory('Error parsing manifest file');

export const ConfigFileReadErr = CreateErrorFactory('Error reading config file');

export const ConfigFileParseErr = CreateErrorFactory('Error parsing config file');

export const FileSizeReadErr = CreateErrorFactory('Error reading file size for file: %s');

export const ArtifactDirectoryCreationErr = CreateErrorFactory('Error creating artifact directory');

export const TargetStatsWriteErr = CreateErrorFactory('Error writing target stats artifact');

export const TargetDiffsWriteErr = CreateErrorFactory('Error writing target diffs artifact');

export const MissingEnvVarErr = CreateErrorFactory('Environment variable %s is required!');

export const GitHubFetchErr = CreateErrorFactory('Error making request to GitHub %s: %s');

export const GitHubAuthorizationErr = CreateErrorFactory('Authorization failed for request to GitHub %s. Did you provide a correct GitHub Api Token? Original response: %s');

export const GitHubInvalidResponseErr = CreateErrorFactory('Error making request to GitHub %s: %s');

export const NoOpenPullRequestFoundErr = CreateErrorFactory('No open pull request found. Skipping target diff step.');

export const MatchedTargetsMismatch = CreateErrorFactory('The number of files matched by `targets: [%s]` is greater than the files matched from the previous build. Current matched files: [%s]. Previous matched files: [%s]');
