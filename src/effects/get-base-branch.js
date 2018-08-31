import makeGitHubRequest from './make-github-request';

export default ({repoOwner, repoName, pullRequestId, githubApiToken}) =>
  makeGitHubRequest({
    path: `repos/${repoOwner}/${repoName}/pulls/${pullRequestId}`,
    githubApiToken
  }).map(prData => prData.base.ref);
