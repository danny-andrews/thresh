/* eslint-disable no-process-env */
import {request} from '@danny.andrews/fp-utils';

import getAssetStats from './get-asset-stats';
import MakeCircleRequest from './make-circle-request';

export default ({repoOwner, repoName}) => ({
  getAssetStats: (...args) => getAssetStats(...args).run({
    makeCircleRequest: MakeCircleRequest({
      circleApiToken: process.env.CIRCLE_API_TOKEN,
      repoOwner,
      repoName
    }),
    request
  })
});

export * from './errors';
