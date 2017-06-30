import {makeCircleRequest, makeGitHubRequest} from './requests';
import {BUNDLE_SIZES_FILEPATH} from './constants';

export default opts => {
  const {
    pullRequestId,
    repoOwner,
    repoName,
    githubApiToken,
    circleApiToken
  } = opts;
  const repoProjectPath = `${repoOwner}/${repoName}`;
  let baseBranch = null;
  let buildNumber = null;

  return makeGitHubRequest({
    githubApiToken,
    path: `repos/${repoProjectPath}/pulls/${pullRequestId}`
  }).then(responseData => {
    baseBranch = responseData.base.ref;

    return makeCircleRequest({
      circleApiToken,
      path: `project/github/${repoProjectPath}/tree/${baseBranch}`
    });
  }).then(responseData => {
    if(responseData.length === 0) {
      throw new Error(
        `No recent builds found for the base branch: ${baseBranch}!`
      );
    }

    buildNumber = responseData[0].buildNum;

    return makeCircleRequest({
      circleApiToken,
      path: `project/github/${repoProjectPath}/${buildNumber}/artifacts`
    });
  }).then(responseData => {
    const artifactPathRegExp = new RegExp(`${BUNDLE_SIZES_FILEPATH}$`);
    const bundleSizeArtifact = responseData
      .find(artifact => artifact.path.match(artifactPathRegExp));
    if(!bundleSizeArtifact) {
      throw new Error(
        `No bundle size artifact found for latest build of: ${baseBranch}.`
          + ` Build number: ${buildNumber}`
      );
    }

    return makeCircleRequest({
      circleApiToken,
      url: bundleSizeArtifact.url
    });
  });
};
