import {CreateErrorFactory} from '@danny.andrews/fp-utils';

/* eslint-disable max-len */
export const CircleCiFetchErr = CreateErrorFactory('Error making request to CircleCI %s: %s');

export const CircleCiInvalidResponseErr = CreateErrorFactory('Error making request to CircleCI %s: %s');

export const NoAssetStatsArtifactFoundErr = CreateErrorFactory('No asset stats artifact found for latest build of: `%s`. Build number: `%s`.');

export const NoRecentBuildsFoundErr = CreateErrorFactory('No recent successful builds found for the base branch: `%s`.');
