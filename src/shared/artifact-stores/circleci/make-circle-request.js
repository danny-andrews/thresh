import {camelizeKeys} from 'humps';
import R from 'ramda';
import {CircleCiFetchErr, CircleCiInvalidResponseErr}
  from '../../../core/errors';
import {NoResponseError, Non200ResponseError, InvalidResponseError, switchCaseF}
  from '../../';
import {request} from '../../../effects/base';

const circleDeserializer = payload => camelizeKeys(payload);

const API_ROOT = 'https://circleci.com/api/v1.1';

const mapError = ({url, context}) =>
  switchCaseF(
    new Map([
      [NoResponseError, CircleCiFetchErr(url, context)],
      [InvalidResponseError, CircleCiInvalidResponseErr(url, context)],
      [Non200ResponseError, CircleCiInvalidResponseErr(url, context.data)]
    ])
  )();

export default ({path, url, fetchOpts = {}, raw = false, circleApiToken}) => {
  const finalUrl = `${url || [API_ROOT, path].join('/')}`
    + `?circle-token=${circleApiToken}`;

  return request(finalUrl, {
    headers: {Accept: 'application/json', ...fetchOpts.headers},
    ...R.omit('headers', fetchOpts)
  })
    .map(raw ? R.identity : circleDeserializer)
    .mapErr(({constructor, context}) =>
      mapError({url: finalUrl, context})(constructor)
    );
};
