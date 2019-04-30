/* eslint-disable no-process-env */
import path from 'path';
import {readFile, mkdir, writeFile, getFileStats, request, resolveGlob}
  from '@danny.andrews/fp-utils';
import commandLineArgs from 'command-line-args';

import thresh from './thresh';
import {MakeGitHubRequest, getConfig} from './effects';

const deps = {
  getFileStats,
  getCommandLineArgs: commandLineArgs,
  logMessage: console.log, // eslint-disable-line no-console
  mkdir,
  readFile,
  request,
  resolve: path.resolve,
  resolveGlob,
  writeFile
};

getConfig().run(deps).then(
  ({
    artifactStore:
      ciStorePath = '@danny.andrews/thresh-artifact-store-circleci',
    ciAdapter:
      ciAdapterPath = '@danny.andrews/thresh-ci-adapter-circleci'
  }) => {
    /* eslint-disable global-require */
    const ArtifactStore = require(ciStorePath).default;
    const CiAdapter = require(ciAdapterPath).default;
    /* eslint-enable global-require */

    const ciAdapter = CiAdapter();

    const {repoOwner, repoName} = ciAdapter.getEnvVars();

    return thresh().run({
      ...deps,
      artifactStore: ArtifactStore({repoOwner, repoName}),
      ciAdapter,
      makeGitHubRequest: MakeGitHubRequest({
        githubApiToken: process.env.GITHUB_API_TOKEN,
        repoOwner,
        repoName
      })
    });
  }
).catch(err => {
  console.error(err); // eslint-disable-line no-console
  process.exit(1); // eslint-disable-line no-process-exit
});
