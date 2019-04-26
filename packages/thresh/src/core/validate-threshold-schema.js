import R from 'ramda';

import {validateSchema} from '../shared';

import {thresholdListSchema} from './schemas';
import {InvalidThresholdOptionErr} from './errors';

export default thresholds => validateSchema(
  thresholdListSchema,
  thresholds
).bimap(
  validator => InvalidThresholdOptionErr(
    validator.errorsText(validator.errors, {separator: '\n'})
  ),
  R.always(thresholds)
);
