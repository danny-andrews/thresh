import test from 'ava';
import expect from 'expect';
import ReaderPromise from '@danny.andrews/reader-promise';

import getPreviousAssetStats from '../get-asset-stats';
import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr}
  from '../errors';

const createFakeMakeCircleRequest = ({
  baseBranch,
  buildNum,
  artifactUrl,
  getRecentBuildsResponse,
  getBuildArtifactsResponse,
  getAssetSizeArtifactResponse
} = {}) => ({path, url, raw}) => {
  if(path === `tree/${baseBranch}`) {
    return ReaderPromise.of(getRecentBuildsResponse);
  } else if(path === `${buildNum}/artifacts`) {
    return ReaderPromise.of(getBuildArtifactsResponse);
  } else if(raw === true && url === artifactUrl) {
    return ReaderPromise.of(getAssetSizeArtifactResponse);
  }

  throw new Error(`Unexpected call to makeCircleRequest: path=${path}, url=${url}, raw=${raw}`);
};

const subject = ({
  buildNum = '92',
  buildStatus = 'success',
  artifactUrl = 'http://circle-artifacts/my-url/84jhdfhads.json',
  baseBranch = 'master',
  assetStatsFilepath = 'asset-stats.json',
  getRecentBuildsResponse,
  getBuildArtifactsResponse,
  getAssetSizeArtifactResponse
} = {}) => getPreviousAssetStats(baseBranch, assetStatsFilepath).run({
  makeCircleRequest: createFakeMakeCircleRequest({
    baseBranch,
    buildNum,
    artifactUrl,
    getRecentBuildsResponse: getRecentBuildsResponse || [{buildNum, status: buildStatus}],
    getBuildArtifactsResponse: getBuildArtifactsResponse || [{path: assetStatsFilepath, url: artifactUrl}],
    getAssetSizeArtifactResponse
  })
});

test(
  'returns artifact body',
  () => subject({getAssetSizeArtifactResponse: 'artifact text'})
    .then(artifact => {
      expect(artifact.right()).toBe('artifact text');
    })
);

test('uses most recent successful build if latest was unsuccessful', () => {
  subject({
    buildNum: '452',
    getRecentBuildsResponse: [
      {
        buildNum: '935',
        status: 'failure',
        previousSuccessfulBuild: {
          buildNum: '452',
          status: 'success'
        }
      },
      {
        buildNum: '452',
        status: 'success'
      }
    ],
    getAssetSizeArtifactResponse: 'artifact body'
  }).then(artifact => {
    expect(artifact.right()).toBe('artifact body');
  });
});

test('returns error when there are no recent builds for the base branch', () => {
  subject({
    baseBranch: 'fjd0823rf2',
    getRecentBuildsResponse: []
  }).then(response => {
    expect(response.left().message).toBe(NoRecentBuildsFoundErr('fjd0823rf2').message);
  });
});

test('returns error when there is no asset stats artifact found for latest build of base branch', () => {
  subject({
    baseBranch: 'lq3i7t42ug',
    buildNum: '6390',
    getBuildArtifactsResponse: []
  }).then(response => {
    expect(response.left().message)
      .toBe(NoAssetStatsArtifactFoundErr('lq3i7t42ug', '6390').message);
  });
});
