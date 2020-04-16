import mkdirp from 'mkdirp';
import {promisify} from 'util';
import fs from 'fs';
import TOML from '@iarna/toml';
import fetch from 'node-fetch';
import glob from 'glob';
import daggy from 'daggy';

import {unthrow} from './util';

export const readFile = promisify(fs.readFile);

export const writeFile = promisify(fs.writeFile);

export const getFileStats = promisify(fs.stat);

export const mkdir = promisify(mkdirp);

export const parseJSON = unthrow(JSON.parse);

export const parseTOML = unthrow(TOML.parse);

export const resolveGlob = promisify(glob);

export const ResponseError = daggy.taggedSum('ResponseError', {
  InvalidResponseError: ['context'],
  Non200ResponseError: ['context'],
  NoResponseError: ['context']
});

export const request = (url, ...args) => {
  // eslint-disable-next-line no-magic-numbers
  const rejectWith = ErrorType => e => Promise.reject(
    ErrorType({message: e.message, url, wrappedError: e})
  );

  return fetch(url, ...args).then(
    response => response.json().then(
      data => response.ok
        ? data
        : Promise.reject(
          ResponseError.Non200ResponseError({
            url,
            status: response.status,
            body: data
          })
        )
    ).catch(rejectWith(ResponseError.InvalidResponseError))
  ).catch(rejectWith(ResponseError.NoResponseError));
};
