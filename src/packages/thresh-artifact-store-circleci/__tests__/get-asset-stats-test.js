import test from 'ava';
import expect, {createSpy} from 'expect';

import getPreviousAssetStats from '../get-asset-stats';
import {FakeRequest} from '../../../test/helpers';
import {PrResource, BuildResource, ArtifactResource}
  from '../test/factories';
import {
  GetBaseBranchHandler,
  GetRecentBuildsHandler,
  GetArtifactsHandler,
  GetArtifactHandler
} from '../test/requests';
import {NoRecentBuildsFoundErr, NoAssetStatsArtifactFoundErr}
  from '../errors';

export const createResponseSequence = (opts = {}) => {
  const {
    getBaseBranchResponse,
    getRecentBuildsResponse,
    getArtifactsResponse,
    getArtifactResponse,
    ref,
    buildNum,
    buildStatus,
    artifactPath,
    artifactUrl,
    artifactBody
  } = opts;

  return [
    GetBaseBranchHandler(getBaseBranchResponse || PrResource({ref})),
    GetRecentBuildsHandler(getRecentBuildsResponse || [
      BuildResource({buildNum, status: buildStatus})
    ]),
    GetArtifactsHandler(getArtifactsResponse || [
      ArtifactResource({path: artifactPath, url: artifactUrl})
    ]),
    GetArtifactHandler(getArtifactResponse || {
      response: artifactBody,
      matcher: new RegExp(artifactUrl)
    })
  ];
};

// Factory which makes this easy to test.
const subject = ({responseData, repoOwner, repoName, ...opts} = {}) => {
  const fakeRequest = createResponseSequence({
    artifactPath: 'blah8372blah/dist/app.js',
    ...responseData
  }) |> FakeRequest;

  return (
    getPreviousAssetStats({
      pullRequestId: '45',
      assetSizesFilepath: 'dist/app.js',
      repoOwner,
      repoName,
      ...opts
    })
  ).run({request: fakeRequest});
};

test('happy path (returns artifact body)', () =>
  subject({
    responseData: {
      artifactBody: 'artifact text'
    }
  }).then(artifact => {
    expect(artifact.right()).toBe('artifact text');
  }));

test('uses most recent successful build if latest was unsuccessful', () => {
  const getArtifactsSpy = createSpy().andReturn([
    ArtifactResource({
      path: '8932hfdlsajlf/thing/dist/my-file.js',
      url: 'http://circle-artifacts/my-url/fj3298hf.json'
    })
  ]);

  return subject({
    assetSizesFilepath: 'dist/my-file.js',
    responseData: {
      getRecentBuildsResponse: [
        BuildResource({
          buildNum: '935',
          status: 'failure',
          previousSuccessfulBuild: BuildResource({buildNum: '452'})
        }),
        BuildResource({
          buildNum: '452',
          status: 'success'
        })
      ],
      getArtifactsResponse: getArtifactsSpy
    }
  }).then(() => {
    expect(getArtifactsSpy.calls[0].arguments[0]).toMatch(/.*\/452\/artifacts/);
  });
});

test('returns error when there are no recent builds for the base branch', () => {
  subject({
    responseData: {
      ref: 'fjd0823rf2',
      getRecentBuildsResponse: []
    }
  }).catch(error => {
    expect(error.message).toBe(NoRecentBuildsFoundErr('fjd0823rf2').message);
  });
});

test('returns error when there is no asset stats artifact found for latest build of base branch', () => {
  subject({
    responseData: {
      ref: 'lq3i7t42ug',
      buildNum: '6390',
      getArtifactsResponse: []
    }
  }).catch(error => {
    expect(error.message)
      .toBe(NoAssetStatsArtifactFoundErr('lq3i7t42ug', '6390').message);
  });
});
