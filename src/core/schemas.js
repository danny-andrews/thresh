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
      default: FailureThresholdStategies.ANY,
      description: `How the threshold is applied. If set to "any", it
        will fail if any asset in the target set is above the threshold. If set
        to "total" it will fail if the total of all assets in the set is above
        the threshold.`
    },
    targets: {
      oneOf: [
        {type: 'string'},
        {
          type: 'array',
          items: {type: 'string'}
        }
      ],
      description: `The target(s) of the threshold. Each target can be either a
        file extension (e.g. ".js" for all javascript assets), an asset path
        "vendor.js" for the "vendor.js" asset, or the special keyword "all" for
        all assets (default).`
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
