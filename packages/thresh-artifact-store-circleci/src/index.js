/* eslint-disable no-process-env */
import {request} from '@danny.andrews/fp-utils';

import getTargetStats from './get-target-stats';
import MakeCircleRequest from './make-circle-request';

export default ({repoOwner, repoName}) => ({
  getTargetStats: (...args) => getTargetStats(...args).run({
    makeCircleRequest: MakeCircleRequest({
      circleApiToken: process.env.CIRCLE_API_TOKEN,
      repoOwner,
      repoName
    }),
    request
  })
});

export * from './errors';
