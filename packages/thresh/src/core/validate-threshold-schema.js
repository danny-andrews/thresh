import R from 'ramda';

import {validateSchema, toList} from '../shared';

import {thresholdListSchema} from './schemas';
import {InvalidThresholdOptionErr} from './errors';

export default thresholds => validateSchema(
  thresholdListSchema,
  thresholds
).bimap(
  validator => InvalidThresholdOptionErr(
    validator.errorsText(validator.errors, {separator: '\n'})
  ),
  () => thresholds.map(
    R.over(
      R.lensProp('targets'),
      toList
    )
  )
);
