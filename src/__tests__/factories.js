import {createSpy} from 'expect';
import {Response} from 'node-fetch';
import R from 'ramda';

export const responsePromiseFac = R.pipe(
  JSON.stringify,
  a => new Response(a),
  a => Promise.resolve(a),
);

export const fetchSpyFac = (response = {}) => createSpy()
  .andReturn(responsePromiseFac(response));

export const prInfoFac = ({ref = '93hg8h4h22'} = {}) => ({
  base: {ref}
});

export const buildFac = ({buildNum = '92'} = {}) => ({buildNum});

export const artifactFac = ({
  path = '8932hfdlsajlf/project-name/bundle-sizes.json',
  url = 'http://circle-artifacts/my-url/84jhdfhads.json'
} = {}) => ({path, url});

const responsesDataFac = options =>
  ({
    getBaseBranchResponse: prInfoFac(),
    getRecentBuildsResponse: [buildFac()],
    getArtifactsResponse: [artifactFac()],
    getArtifactResponse: {},
    ...options
  });

const orderResponses = responses => [
  responses.getBaseBranchResponse,
  responses.getRecentBuildsResponse,
  responses.getArtifactsResponse,
  responses.getArtifactResponse
];

export const integrationFetchSpyFac = (responses = {}) => {
  const orderedResponses = R.pipe(
    responsesDataFac,
    R.map(responsePromiseFac),
    orderResponses,
  )(responses);

  const spy = createSpy().andCall(
    () => orderedResponses[spy.calls.length - 1] || responsePromiseFac({})
  );

  return spy;
};
