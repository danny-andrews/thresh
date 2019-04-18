const failureThresholdSchema = {
  title: 'Failure Threshold',
  type: 'object',
  properties: {
    maxSize: {
      type: 'number'
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
  required: ['maxSize', 'targets']
};

export const failureThresholdListSchema = {
  title: 'Failure Threshold List',
  type: 'array',
  items: failureThresholdSchema
};
