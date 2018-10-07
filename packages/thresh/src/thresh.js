/* eslint-disable no-process-env */
import path from 'path';

import cli from './cli';
import {readFile, mkdir, writeFile, getFileStats, Database, request}
  from './shared';
import CircleciAdapter from './shared/ci-adapters/circleci';
import CircleciArtifactStore from './shared/artifact-stores/circleci';
import {MakeGitHubRequest} from './effects';

const {repoOwner, repoName} = CircleciAdapter().getEnvVars();

cli().run({
  writeFile,
  readFile,
  resolve: path.resolve,
  request,
  db: Database('my.db'),
  mkdir,
  getFileStats,
  logMessage: console.log, // eslint-disable-line no-console
  logError: console.error, // eslint-disable-line no-console
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
