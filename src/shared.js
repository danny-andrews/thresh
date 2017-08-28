import R from 'ramda';
import Ajv from 'ajv';
import fs from 'fs';
import mkdirp from 'mkdirp';
import {Either} from 'monet';
import {promisify} from 'util';

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

export const isError = maybeError => R.type(maybeError) === 'Error';

export const truncate = R.curry(({maxSize, contSuffix = '...'}, string) => (
  string.length > maxSize
    ? [string.substring(0, maxSize - contSuffix.length), contSuffix].join('')
    : string
));

export const PromiseError = R.pipe(
  (...args) => new Error(...args),
  a => Promise.reject(a)
);
