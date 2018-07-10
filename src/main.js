/* eslint-disable no-console */
import path from 'path';
import {mkdir, writeFile, readFile, getFileStats, Database, request}
  from './shared';
import circleciWeighIn from './circleci-weigh-in';

export default (...args) => {
  circleciWeighIn(...args)
    .run({
      writeFile,
      readFile,
      resolve: path.resolve,
      request,
      db: Database('my.db'),
      mkdir,
      getFileStats,
      repoOwner: process.env.CIRCLE_PROJECT_USERNAME,
      repoName: process.env.CIRCLE_PROJECT_REPONAME,
      githubApiToken: process.env.GITHUB_API_TOKEN,
      circleApiToken: process.env.CIRCLE_API_TOKEN,
      logMessage: console.log,
      logError: console.error
    }).catch(err => {
      // Catchall in case our error logging logic has an error. :D
      console.error(err);
      process.exit(1); // eslint-disable-line no-process-exit
    });
};
