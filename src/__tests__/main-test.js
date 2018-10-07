import test from 'ava';
import {Maybe, Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import {
  GetBaseBranchHandler,
  GetRecentBuildsHandler,
  GetArtifactsHandler,
  GetArtifactHandler,
  PostPrStatusHandler
} from '@danny.andrews/thresh-artifact-store-circleci/test/requests';

import main from '../main';
import {FakeRequest} from '../test/helpers';

const fakeRequest = FakeRequest([
  GetBaseBranchHandler({
    base: {ref: 'd39h'}
  }),
  GetRecentBuildsHandler([{
    buildNum: '92',
    status: 'success'
  }]),
  GetArtifactsHandler([{
    path: '8932hfdlsajlf/project-name/asset-stats.json',
    url: 'http://circle-artifacts/my-url/84jhdfhads.json'
  }]),
  GetArtifactHandler({
    response: '{}',
    matcher: new RegExp('my-url/84jhdfhads')
  }),
  PostPrStatusHandler()
]);

test('stupid basic integration test (FIXME: need to actually make assertions)', () => {
  main({
    statsFilepath: 'dist/stats.js',
    manifestFilepath: 'dist/manifest.json',
    projectName: Maybe.None(),
    outputDirectory: '',
    failureThresholds: [],
    buildSha: '8fdhihfj',
    buildUrl: 'http://circle.com/my-build',
    repoOwner: 'me',
    repoName: 'my-repo',
    pullRequestId: Maybe.of('f820yf3h'),
    artifactsDirectory: 'lfjk3208hohefi4/artifacts'
  }).run({
    writeFile: () => Promise.resolve(),
    readFile: () => Promise.resolve('{}'),
    resolve: () => Promise.resolve(),
    db: () => Promise.resolve(),
    mkdir: () => Promise.resolve(),
    getFileStats: () => Promise.resolve({}),
    logMessage: () => {},
    logError: () => {},
    request: fakeRequest,
    makeGitHubRequest: () => ReaderPromise.of({base: {}}),
    artifactStore: {
      getAssetStats: () => Promise.resolve(
        Either.Right({})
      )
    }
  });
});

test.todo('happy path (makes artifact directory, writes asset stats to file, and writes asset diffs to file)');
test.todo('handles case where no open pull request is found');
test.todo('returns error when non-schema-matching failure threshold is provided');
test.todo('handles invalid failure threshold case');
test.todo('surfaces errors reading stats file');
test.todo('surfaces errors making artifact directory');
test.todo('surfaces errors writing asset sizes');
test.todo('surfaces errors writing asset diffs');
test.todo('saves stats to local db when project name is given');
test.todo('writes message to the console when no previous stat found for given filepath');
test.todo('handles case where previous build has no stats for current project');
test.todo('posts error PR status when error is encountered');
