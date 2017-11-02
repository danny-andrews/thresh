import test from 'ava';
import R from 'ramda';
import expect from 'expect';
import subject from '../retrieve-base-bundle-sizes';
import {prInfoFac, buildFac, artifactFac, integrationFetchSpyFac} from './factories';

const optsFac = (opts = {}) => ({
  pullRequestId: '45',
  bundleSizesFilepath: 'dist/vendor.js',
  ...opts
});

const fac = R.pipe(optsFac, subject);

const getNamedCalls = spy => {
  const [
    getBaseBranchCall,
    getRecentBuildsCall,
    getArtifactsCall,
    getArtifactCall
  ] = spy.calls;

  return {
    getBaseBranchCall,
    getRecentBuildsCall,
    getArtifactsCall,
    getArtifactCall
  };
};

test('happy path (makes all requests and returns artifact body)', async () => {
  const spy = integrationFetchSpyFac({
    getBaseBranchResponse: prInfoFac({ref: 'hof893f32g'}),
    getRecentBuildsResponse: [buildFac({buildNum: '935'})],
    getArtifactsResponse: [
      artifactFac({
        path: '8932hfdlsajlf/thing/dist/vendor.js',
        url: 'http://circle-artifacts/my-url/fj3298hf.json'
      })
    ],
    getArtifactResponse: 'this is the artifact, yo!'
  });

  const artifact = await subject({
    pullRequestId: '45',
    repoOwner: 'me',
    repoName: 'my-repo',
    bundleSizesFilepath: 'dist/vendor.js'
  }).run({
    request: spy,
    githubApiToken: '438943hgr3',
    circleApiToken: '743qhy973f',
    repoOwner: 'me',
    repoName: 'my-repo'
  });

  const {
    getBaseBranchCall,
    getRecentBuildsCall,
    getArtifactsCall,
    getArtifactCall
  } = getNamedCalls(spy);

  expect(getBaseBranchCall.arguments[0]).toBe('https://api.github.com/repos/me/my-repo/pulls/45');
  expect(getRecentBuildsCall.arguments[0]).toBe('https://circleci.com/api/v1.1/project/github/me/my-repo/tree/hof893f32g?circle-token=743qhy973f');
  expect(getArtifactsCall.arguments[0]).toBe('https://circleci.com/api/v1.1/project/github/me/my-repo/935/artifacts?circle-token=743qhy973f');
  expect(getArtifactCall.arguments[0]).toBe('http://circle-artifacts/my-url/fj3298hf.json?circle-token=743qhy973f');
  expect(artifact).toBe('this is the artifact, yo!');
});

test('returns error when there are no recent builds for the base branch', () => {
  const spy = integrationFetchSpyFac({
    getRecentBuildsResponse: [],
    getBaseBranchResponse: prInfoFac({ref: 'fjd0823rf2'})
  });

  return fac().run({request: spy}).catch(error => {
    expect(error).toBeA(Error);
    expect(error.message)
      .toBe('No recent builds found for the base branch: fjd0823rf2!');
  });
});

test('returns error when there are no bundle size artifacts found for latest build of base branch', () => {
  const spy = integrationFetchSpyFac({
    getBaseBranchResponse: prInfoFac({ref: 'lq3i7t42ug'}),
    getRecentBuildsResponse: [buildFac({buildNum: '6390'})],
    getArtifactsResponse: []
  });

  return fac().run({request: spy}).catch(error => {
    expect(error).toBeA(Error);
    expect(error.message)
      .toBe('No bundle size artifact found for latest build of: lq3i7t42ug. Build number: 6390');
  });
});
