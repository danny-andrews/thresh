import test from 'ava';
import expect from 'expect';
import ReaderPromise from '@danny.andrews/reader-promise';

import getTargetStats from '../get-target-stats';

const createFakeMakeCircleRequest = ({
  baseBranch,
  buildNum,
  artifactUrl,
  getRecentBuildsResponse,
  getBuildArtifactsResponse,
  getTargetSizeArtifactResponse
} = {}) => ({path, url, raw}) => {
  if(path === `tree/${baseBranch}`) {
    return ReaderPromise.of(getRecentBuildsResponse);
  }
  if(path === `${buildNum}/artifacts`) {
    return ReaderPromise.of(getBuildArtifactsResponse);
  }
  if(raw === true && url === artifactUrl) {
    return ReaderPromise.of(getTargetSizeArtifactResponse);
  }

  throw new Error(`Unexpected call to makeCircleRequest: path=${path}, url=${url}, raw=${raw}`);
};

const subject = ({
  buildNum = '92',
  buildStatus = 'success',
  artifactUrl = 'http://circle-artifacts/my-url/84jhdfhads.json',
  baseBranch = 'master',
  targetStatsFilepath = 'target-stats.json',
  getRecentBuildsResponse = [{buildNum, status: buildStatus}],
  getBuildArtifactsResponse = [{path: targetStatsFilepath, url: artifactUrl}],
  getTargetSizeArtifactResponse
} = {}) => getTargetStats(baseBranch, targetStatsFilepath).run({
  makeCircleRequest: createFakeMakeCircleRequest({
    baseBranch,
    buildNum,
    artifactUrl,
    getRecentBuildsResponse,
    getBuildArtifactsResponse,
    getTargetSizeArtifactResponse
  })
});

test(
  'returns artifact body',
  () => subject({
    getTargetSizeArtifactResponse: 'artifact text'
  }).then(artifact => {
    expect(artifact).toBe('artifact text');
  })
);

test(
  'uses most recent successful build if latest was unsuccessful',
  () => subject({
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
    getTargetSizeArtifactResponse: 'artifact body'
  }).then(artifact => {
    expect(artifact).toBe('artifact body');
  })
);

test(
  'returns error when there are no recent builds for the base branch',
  () => subject({baseBranch: 'fjd0823rf2', getRecentBuildsResponse: []})
    .catch(response => {
      expect(response.message).toBe('No recent successful builds found for the base branch: `fjd0823rf2`.');
    })
);

test(
  'returns error when there is no target stats artifact found for latest build of base branch',
  () => subject({
    baseBranch: 'lq3i7t42ug',
    buildNum: '6390',
    getBuildArtifactsResponse: []
  }).catch(response => {
    expect(response.message).toBe('No target stats artifact found for latest build of: `lq3i7t42ug`. Build number: `6390`.');
  })
);

test(
  'returns error when no recent builds are found',
  () => subject({buildNum: null, baseBranch: 'release/22'})
    .catch(response => {
      expect(response.message).toBe('No recent successful builds found for the base branch: `release/22`.');
    })
);
