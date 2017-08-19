import {camelizeKeys, decamelizeKeys} from 'humps';
import {contains, omit} from 'ramda';
import fetch from 'node-fetch';

/* eslint-disable no-magic-numbers */
const Statuses = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403
};
/* eslint-enable no-magic-numbers */

export const gitHubSerializer = payload =>
  JSON.stringify(decamelizeKeys(payload));

const gitHubDeserializer = payload => camelizeKeys(payload);

const circleDeserializer = payload => camelizeKeys(payload);

export const makeGitHubRequest = ({path, fetchOpts = {}, githubApiToken}) => {
  const HOSTNAME = 'https://api.github.com';
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${githubApiToken}`,
    ...fetchOpts.headers
  };
  const isAuthError = status => contains(status, [
    Statuses.UNAUTHORIZED,
    Statuses.FORBIDDEN
  ]);
  const url = `${HOSTNAME}/${path}`;

  return fetch(url, {headers, ...omit('headers', fetchOpts)})
    .then(response => {
      if(response.ok) {
        return response.json();
      } else if(isAuthError(response.status)) {
        throw new Error(`Authorization failed for request to GitHub ${url}.`
          + 'Did you provide a correct GitHub Api Token? Original response:'
          + ` ${response.statusText}`);
      } else {
        response.json().then(err => {
          console.log(err);
        });
        throw new Error(
          `Error making request to GitHub ${url}: ${response.statusText}`
        );
      }
    })
    .then(gitHubDeserializer)
    .catch(e => {
      throw new Error(`Error making request to GitHub ${url}: ${e}`);
    });
};

export const makeCircleRequest = opts => {
  const {path, url, fetchOpts = {}, raw = false, circleApiToken} = opts;
  const API_ROOT = 'https://circleci.com/api/v1.1';
  const headers = {Accept: 'application/json', ...fetchOpts.headers};
  const deserializer = raw ? a => a : circleDeserializer;
  const finalUrl = `${url || [API_ROOT, path].join('/')}`
    + `?circle-token=${circleApiToken}`;

  return fetch(finalUrl, {headers, ...omit('headers', fetchOpts)})
    .then(response => {
      if(response.ok) {
        return response.json();
      }

      throw new Error(
        `Error making request to CircleCI ${finalUrl}: ${response.statusText}`
      );
    })
    .then(deserializer)
    .catch(e => {
      throw new Error(`Error making request to CircleCI ${finalUrl}: ${e}`);
    });
};
