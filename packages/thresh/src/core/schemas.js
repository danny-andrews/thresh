import {FailureThresholdStategies} from './constants';

const failureThresholdSchema = {
  title: 'Failure Threshold',
  type: 'object',
  properties: {
    maxSize: {
      type: 'number'
    },
    strategy: {
      type: 'string',
      enum: [FailureThresholdStategies.ANY, FailureThresholdStategies.TOTAL],
      default: FailureThresholdStategies.ANY
    },
    targets: {
      oneOf: [
        {type: 'string'},
        {
          type: 'array',
          items: {type: 'string'}
        }
      ]
    }
  },
  required: ['maxSize']
};

export const failureThresholdListSchema = {
  title: 'Failure Threshold List',
  type: 'array',
  items: failureThresholdSchema
};

export const DFAULT_FAILURE_THRESHOLD_STRATEGY =
  failureThresholdSchema.properties.strategy.default;
