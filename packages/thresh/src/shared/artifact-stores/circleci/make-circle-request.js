import {camelizeKeys} from 'humps';
import R from 'ramda';
import {sprintf} from 'sprintf-js';
import ReaderPromise from '@danny.andrews/reader-promise';

import {NoResponseError, Non200ResponseError, InvalidResponseError, switchCaseF}
  from '../..';
import {request} from '../../../effects/base';

import {CircleCiFetchErr, CircleCiInvalidResponseErr} from './errors';

const circleDeserializer = payload => camelizeKeys(payload);

const API_ROOT = 'https://circleci.com/api/v1.1';

const mapError = ({url, context}) => switchCaseF(
  new Map([
    [NoResponseError, CircleCiFetchErr(url, context)],
    [InvalidResponseError, CircleCiInvalidResponseErr(url, context)],
    [Non200ResponseError, CircleCiInvalidResponseErr(url, context)]
  ])
)();

export default ({circleApiToken, repoOwner, repoName}) =>
  ({path, url, fetchOpts = {}, raw = false}) => {
    const finalUrl = sprintf(
      '%s?circle-token=%s',
      url || [
        API_ROOT,
        'project',
        'github',
        repoOwner,
        repoName,
        path
      ].join('/'),
      circleApiToken
    );

    return request(finalUrl, {
      headers: {Accept: 'application/json', ...fetchOpts.headers},
      ...R.omit('headers', fetchOpts)
    }).map(raw ? R.identity : circleDeserializer)
      .chainErr(
        ({constructor, context}) => ReaderPromise.fromError(
          mapError({url: finalUrl, context})(constructor)
        )
      );
  };
