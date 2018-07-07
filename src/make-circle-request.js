import {camelizeKeys} from 'humps';
import R from 'ramda';
import ReaderPromise from './core/reader-promise';
import {CircleCiFetchErr, CircleCiInvalidResponseErr} from './core/errors';
import {NoResponseError, Non200ResponseError, InvalidResponseError, switchCaseF}
  from './shared';

const circleDeserializer = payload => camelizeKeys(payload);

const API_ROOT = 'https://circleci.com/api/v1.1';

const mapError = ({url, context, constructor}) =>
  switchCaseF({
    [NoResponseError]: CircleCiFetchErr(url, context),
    [InvalidResponseError]: CircleCiInvalidResponseErr(url, context),
    [Non200ResponseError]: CircleCiInvalidResponseErr(url, context.data)
  })()(constructor);

export default ({path, url, fetchOpts = {}, raw = false}) =>
  ReaderPromise.fromReaderFn(({request, circleApiToken}) => {
    const finalUrl = `${url || [API_ROOT, path].join('/')}`
      + `?circle-token=${circleApiToken}`;

    return request(finalUrl, {
      headers: {Accept: 'application/json', ...fetchOpts.headers},
      ...R.omit('headers', fetchOpts)
    })
      .catch(({constructor, context}) =>
        Promise.reject(mapError({url: finalUrl, context, constructor}))
      )
      .then(raw ? R.identity : circleDeserializer);
  });
