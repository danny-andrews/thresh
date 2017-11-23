import makeGitHubRequest from './make-github-request';
import makeCircleRequest from './make-circle-request';
import ReaderPromise from './core/reader-promise';

export default ({pullRequestId, bundleSizesFilepath}) =>
  ReaderPromise.fromReaderFn(config => {
    const repoProjectPath = [config.repoOwner, config.repoName].join('/');

    const getBaseBranch = makeGitHubRequest({
      path: `repos/${repoProjectPath}/pulls/${pullRequestId}`
    });

    const getRecentBuilds = baseBranch =>
      makeCircleRequest({
        path: `project/github/${repoProjectPath}/tree/${baseBranch}`
      });

    const getBuildArtifacts = buildNumber =>
      makeCircleRequest({
        path: `project/github/${repoProjectPath}/${buildNumber}/artifacts`
      });

    const getBundleSizeArtifact = bundleSizeArtifactUrl =>
      makeCircleRequest({url: bundleSizeArtifactUrl, raw: true});

    return getBaseBranch.chain(prData => {
      const baseBranch = prData.base.ref;

      return getRecentBuilds(baseBranch).chain(recentBuilds => {
        if(recentBuilds.length === 0) {
          return ReaderPromise.Error(
            `No recent builds found for the base branch: ${baseBranch}!`
          );
        }

        const buildNumber = recentBuilds[0].buildNum;

        return getBuildArtifacts(buildNumber).chain(buildArtifacts => {
          const artifactPathRegExp = new RegExp(`${bundleSizesFilepath}$`);
          const bundleSizeArtifact = buildArtifacts
            .find(artifact => artifact.path.match(artifactPathRegExp));
          if(!bundleSizeArtifact) {
            return ReaderPromise.Error('No bundle size artifact found for '
              + `latest build of: ${baseBranch}. Build number: ${buildNumber}`);
          }

          return getBundleSizeArtifact(bundleSizeArtifact.url);
        });
      });
    }).run(config);
  });
