import test from 'ava';
import {Maybe, Either} from 'monet';

import ReaderPromise from '../shared/reader-promise';
import {
  postFinalPrStatus,
  postPendingPrStatus,
  postErrorPrStatus,
  makeArtifactDirectory,
  readManifest,
  saveStats,
  writeAssetStats,
  writeAssetDiffs,
  getAssetFileStats,
  getBaseBranch
} from '../effects';
import thresh from '../thresh';
import {FakeRequest} from '../test/helpers';
import {
  GetBaseBranchHandler,
  GetRecentBuildsHandler,
  GetArtifactsHandler,
  GetArtifactHandler,
  PostPrStatusHandler
} from '../shared/artifact-stores/circleci/test/requests';

const subject = thresh({
  postFinalPrStatus,
  postPendingPrStatus,
  postErrorPrStatus,
  artifactStore: {
    getAssetStats: () => ReaderPromise.of(
      Either.Right({})
    )
  },
  makeArtifactDirectory,
  readManifest,
  getAssetFileStats,
  saveStats,
  writeAssetStats,
  writeAssetDiffs,
  getBaseBranch
});

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
  subject({
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
    makeGitHubRequest: () => ReaderPromise.of({base: {}})
  });
});
