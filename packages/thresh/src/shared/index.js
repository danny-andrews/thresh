import R from 'ramda';
import Ajv from 'ajv';
import {Either} from 'monet';

const JSON_OUTPUT_SPACING = 2;

export const truncate = R.curry(({maxSize, contSuffix = '...'}, string) => (
  string.length > maxSize
    ? [string.substring(0, maxSize - contSuffix.length), contSuffix].join('')
    : string
));

export const serializeForFile = val =>
  JSON.stringify(val, null, JSON_OUTPUT_SPACING);

export const validateSchema = (schema, object) => {
  const validator = new Ajv({allErrors: true});

  return validator.validate(schema, object)
    ? Either.Right(true)
    : Either.Left(validator);
};

export const sumReduce = R.curry(
  (getValue, list) => list.reduce((sum, item) => sum + getValue(item), 0)
);

export const listToMap = R.curry(
  (getKey, list) => list.reduce(
    (obj, item) => ({[getKey(item)]: item, ...obj}),
    {}
  )
);

export const toList = a => R.flatten([a]);
