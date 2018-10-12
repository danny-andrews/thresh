import {CreateErrorFactory} from '@danny.andrews/fp-utils';

/* eslint-disable max-len */
export const InvalidFailureThresholdOptionErr = CreateErrorFactory("'failure-thresholds' option is invalid. Problem(s): %s");

export const InvalidFailureThresholdErr = CreateErrorFactory('Invalid failure threshold provided. No targets found for target: [%s]');

export const ManifestFileReadErr = CreateErrorFactory('Error reading manifest file');

export const ManifestFileParseErr = CreateErrorFactory('Error parsing manifest file');

export const ConfigFileReadErr = CreateErrorFactory('Error reading config file');

export const ConfigFileParseErr = CreateErrorFactory('Error parsing config file');

export const AssetFileStatReadErr = CreateErrorFactory('Error reading asset file stat: %s');

export const ArtifactDirectoryCreationErr = CreateErrorFactory('Error creating artifact directory');

export const AssetStatsWriteErr = CreateErrorFactory('Error writing asset stats artifact');

export const AssetDiffsWriteErr = CreateErrorFactory('Error writing asset diffs artifact');

export const MissingEnvVarErr = CreateErrorFactory('Environment variable %s is required!');

export const MissingCliOptionErr = CreateErrorFactory("'%s' option is required!");

export const CliOptionInvalidJsonErr = CreateErrorFactory("'%s' option is not valid JSON!");

export const GitHubFetchErr = CreateErrorFactory('Error making request to GitHub %s: %s');

export const GitHubAuthorizationErr = CreateErrorFactory('Authorization failed for request to GitHub %s. Did you provide a correct GitHub Api Token? Original response: %s');

export const GitHubInvalidResponseErr = CreateErrorFactory('Error making request to GitHub %s: %s');

export const NoOpenPullRequestFoundErr = CreateErrorFactory('No open pull request found. Skipping asset diff step.');

export const NoPreviousStatsFoundForFilepath = CreateErrorFactory('No previous stats found for %s. Did you rename that file recently?');
