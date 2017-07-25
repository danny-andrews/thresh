import {makeCircleRequest, makeGitHubRequest} from './requests';

export default async opts => {
  const {
    pullRequestId,
    repoOwner,
    repoName,
    githubApiToken,
    circleApiToken,
    bundleSizesFilepath
  } = opts;
  const repoProjectPath = `${repoOwner}/${repoName}`;

  const prData = await makeGitHubRequest({
    githubApiToken,
    path: `repos/${repoProjectPath}/pulls/${pullRequestId}`
  });

  const baseBranch = prData.base.ref;

  const recentBuilds = await makeCircleRequest({
    circleApiToken,
    path: `project/github/${repoProjectPath}/tree/${baseBranch}`
  });

  if(recentBuilds.length === 0) {
    throw new Error(
      `No recent builds found for the base branch: ${baseBranch}!`
    );
  }

  const buildNumber = recentBuilds[0].buildNum;

  const buildArtifacts = await makeCircleRequest({
    circleApiToken,
    path: `project/github/${repoProjectPath}/${buildNumber}/artifacts`
  });

  const artifactPathRegExp = new RegExp(`${bundleSizesFilepath}$`);
  const bundleSizeArtifact = buildArtifacts
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
};
