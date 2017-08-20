import {join, pipe, reject, type} from 'ramda';
import Ajv from 'ajv';
import fs from 'fs';
import mkdirp from 'mkdirp';

export const compact = list => reject(item => !item, list);

export const compactAndJoin =
  (separator, list) => pipe(compact, join(separator))(list);

export const unthrow = (fn, rethrowCond = () => false) => (...args) => {
  try {
    return fn(...args);
  } catch(e) {
    if(rethrowCond(e)) {
      throw e;
    } else {
      return e;
    }
  }
};

export const parseJSON = unthrow(JSON.parse);
export const readFileSync = unthrow(fs.readFileSync);
export const writeFileSync = unthrow(fs.writeFileSync);
export const mkdirpSync = unthrow(mkdirp.sync);

export const SchemaValidator = () => new Ajv({allErrors: true});

export const isError = maybeError => type(maybeError) === 'Error';

export const truncate = ({maxSize, contSuffix = '...'}, string) => (
  string.length > maxSize
    ? string.substring(0, maxSize - contSuffix.length)
    : string
);
