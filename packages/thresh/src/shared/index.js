import R from 'ramda';
import FlatFileDb from 'flat-file-db';
import Ajv from 'ajv';
import {Either} from 'monet';

import {JSON_OUTPUT_SPACING} from '../core/constants';

export const compact = R.reject(item => R.isNil(item) || R.isEmpty(item));

export const compactAndJoin = (separator, list) => compact(list)
  |> R.join(separator);

export const truncate = R.curry(({maxSize, contSuffix = '...'}, string) => (
  string.length > maxSize
    ? [string.substring(0, maxSize - contSuffix.length), contSuffix].join('')
    : string
));

export const serializeForFile = val =>
  JSON.stringify(val, null, JSON_OUTPUT_SPACING);

export const Database = (...args) => {
  const flatFileDb = FlatFileDb(...args);

  return new Promise(
    resolve => flatFileDb.on('open', () => resolve(flatFileDb))
  );
};

export const validateSchema = (schema, object) => {
  const validator = new Ajv({allErrors: true});

  return validator.validate(schema, object)
    ? Either.Right(true)
    : Either.Left(validator);
};
