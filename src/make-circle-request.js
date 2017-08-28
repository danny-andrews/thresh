import {camelizeKeys} from 'humps';
import R from 'ramda';
import {isError, PromiseError} from './shared';
import ReaderPromise from './core/reader-promise';

const circleDeserializer = payload => camelizeKeys(payload);

const API_ROOT = 'https://circleci.com/api/v1.1';

export default ({path, url, fetchOpts = {}, raw = false}) =>
  ReaderPromise.fromReaderFn(({request, circleApiToken}) => {
    const finalUrl = `${url || [API_ROOT, path].join('/')}`
      + `?circle-token=${circleApiToken}`;

    return request(finalUrl, {
      headers: {Accept: 'application/json', ...fetchOpts.headers},
      ...R.omit('headers', fetchOpts)
    }).then(response => {
      if(response.ok) {
        return response.json();
      } else if(isError(response)) {
        return PromiseError(
          `Error making request to CircleCI ${finalUrl}: ${response}`
        );
      }

      return PromiseError(
        `Error making request to CircleCI ${finalUrl}: ${response.statusText}`
      );
    }).then(raw ? a => a : circleDeserializer);
  });
