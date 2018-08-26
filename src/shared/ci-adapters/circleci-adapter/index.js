import R from 'ramda';
import {Maybe} from 'monet';

export default () => ({
  isRunning: () => process.env.CIRCLECI === 'true',
  getEnvVars: () => ({
    buildSha: process.env.CIRCLE_SHA1,
    buildUrl: process.env.CIRCLE_BUILD_URL,
    artifactsDirectory: process.env.CIRCLE_ARTIFACTS,
    repoOwner: process.env.CIRCLE_PROJECT_USERNAME,
    repoName: process.env.CIRCLE_PROJECT_REPONAME,
    pullRequestId: Maybe.fromNull(process.env.CI_PULL_REQUEST)
      .map(str => str |> R.split('/') |> R.last)
  })
});
