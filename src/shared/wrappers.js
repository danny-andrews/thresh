import Ajv from 'ajv';
import FlatFileDb from 'flat-file-db';
import fetch from 'node-fetch';
import toml from 'toml';

import {CreateErrorFactory, unthrow} from './util';

export const Database = (...args) => {
  const flatFileDb = FlatFileDb(...args);

  return new Promise(
    resolve => flatFileDb.on('open', () => resolve(flatFileDb))
  );
};

export const SchemaValidator = () => new Ajv({allErrors: true});

export const Non200ResponseError = CreateErrorFactory();
export const NoResponseError = CreateErrorFactory();
export const InvalidResponseError = CreateErrorFactory();

const rejectWith = Type =>
  a => Promise.reject(Type(a));

export const request = (...args) => fetch(...args).then(
  response => response.json().then(
    data => response.ok
      ? data
      : rejectWith(Non200ResponseError)({...response, data})
  ).catch(rejectWith(InvalidResponseError))
).catch(rejectWith(NoResponseError));

export const parseTOML = unthrow(toml.parse);
