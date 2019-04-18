const thresholdSchema = {
  title: 'Threshold',
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

export const thresholdListSchema = {
  title: 'Threshold List',
  type: 'array',
  items: thresholdSchema
};
