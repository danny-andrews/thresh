import R from 'ramda';
import Ajv from 'ajv';
import fs from 'fs';
import mkdirp from 'mkdirp';
import {Either} from 'monet';
import {promisify} from 'util';
import {JSON_OUTPUT_SPACING} from './core/constants';

export const compact = list => R.reject(item => !item, list);

export const compactAndJoin = (separator, list) =>
  R.pipe(compact, R.join(separator))(list);

export const unthrow = fn => (...args) => {
  try {
    return Either.Right(fn(...args));
  } catch(e) {
    return Either.Left(e);
  }
};

export const parseJSON = unthrow(JSON.parse);

export const readFile = promisify(fs.readFile);

export const writeFile = promisify(fs.writeFile);

export const mkdir = promisify(mkdirp);

export const SchemaValidator = () => new Ajv({allErrors: true});

export const truncate = R.curry(({maxSize, contSuffix = '...'}, string) => (
  string.length > maxSize
    ? [string.substring(0, maxSize - contSuffix.length), contSuffix].join('')
    : string
));

export const serializeForFile = val =>
  JSON.stringify(val, null, JSON_OUTPUT_SPACING);
