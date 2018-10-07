import mkdirp from 'mkdirp';
import {promisify} from 'util';
import fs from 'fs';
import fetch from 'node-fetch';
import toml from 'toml';

import {unthrow, CreateFactory} from './lang';

export const readFile = promisify(fs.readFile);

export const writeFile = promisify(fs.writeFile);

export const getFileStats = promisify(fs.stat);

export const mkdir = promisify(mkdirp);

export const parseJSON = unthrow(JSON.parse);

export const parseTOML = unthrow(toml.parse);

const CreateRequestErrorFactory = () => CreateFactory(context => ({context}));

export const Non200ResponseError = CreateRequestErrorFactory();
export const NoResponseError = CreateRequestErrorFactory();
export const InvalidResponseError = CreateRequestErrorFactory();

const rejectWith = Type => a => Promise.reject(Type(a));

export const request = (...args) => fetch(...args).then(
  response => response.json().then(
    data => response.ok
      ? data
      : rejectWith(Non200ResponseError)({...response, data})
  ).catch(rejectWith(InvalidResponseError))
).catch(rejectWith(NoResponseError));
