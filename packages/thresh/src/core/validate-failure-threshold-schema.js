import R from 'ramda';

import {validateSchema} from '../shared';

import {failureThresholdListSchema} from './schemas';
import {InvalidFailureThresholdOptionErr} from './errors';

export default failureThresholds => validateSchema(
  failureThresholdListSchema,
  failureThresholds
).bimap(
  validator => InvalidFailureThresholdOptionErr(
    validator.errorsText(validator.errors, {separator: '\n'})
  ),
  R.identity
);
