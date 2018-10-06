import Ajv from 'ajv';
import {Either} from 'monet';
import R from 'ramda';

import {failureThresholdListSchema} from './schemas';
import {InvalidFailureThresholdOptionErr} from './errors';

const validateSchema = (schema, object) => {
  const validator = new Ajv({allErrors: true});

  return validator.validate(schema, object)
    ? Either.Right()
    : Either.Left(validator);
};

export default failureThresholds => validateSchema(
  failureThresholdListSchema,
  failureThresholds
).bimap(
  validator => InvalidFailureThresholdOptionErr(
    validator.errorsText(validator.errors, {separator: '\n'})
  ),
  R.identity
);
