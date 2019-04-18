/* eslint-disable no-process-env */
import path from 'path';
import {readFile, mkdir, writeFile, getFileStats, request, resolveGlob}
  from '@danny.andrews/fp-utils';
import CircleciAdapter from '@danny.andrews/thresh-ci-adapter-circleci';
import CircleciArtifactStore
  from '@danny.andrews/thresh-artifact-store-circleci';

import cli from './cli';
import {MakeGitHubRequest} from './effects';

const {repoOwner, repoName} = CircleciAdapter().getEnvVars();

cli().run({
  writeFile,
  readFile,
  resolve: path.resolve,
  request,
  mkdir,
  getFileStats,
  resolveGlob,
  logMessage: console.log, // eslint-disable-line no-console
  makeGitHubRequest: MakeGitHubRequest({
    githubApiToken: process.env.GITHUB_API_TOKEN,
    repoOwner,
    repoName
  }),
  artifactStore: CircleciArtifactStore({repoOwner, repoName})
}).catch(err => {
  console.error(err); // eslint-disable-line no-console
  process.exit(1); // eslint-disable-line no-process-exit
});
