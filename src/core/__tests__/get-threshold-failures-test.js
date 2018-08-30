import test from 'ava';
import expect from 'expect';
import R from 'ramda';

import {InvalidFailureThresholdErr} from '../errors';
import subject from '../get-threshold-failures';

const testSets = [{
  title: 'singleton target, asset with size > maxSize',
  expected: [{
    offendingAssets: ['app.js']
  }],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 35
    }],
    failureThresholds: [{
      targets: 'app.js',
      maxSize: 2,
      strategy: 'any'
    }]
  }
},
{
  title: 'asset with size < maxSize',
  expected: [],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 21
    }],
    failureThresholds: [{
      targets: 'app.js',
      maxSize: 80,
      strategy: 'any'
    }]
  }
},
{
  title: 'asset with size === maxSize',
  expected: [],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 80,
      strategy: 'any'
    }],
    failureThresholds: [{
      targets: 'app.js',
      maxSize: 80
    }]
  }
},
{
  title: '"total" strategy, failure',
  expected: [{
    offendingAssets: ['app.js', 'vendor.js']
  }],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 34
    },
    {
      filepath: 'vendor.js',
      size: 455
    }],
    failureThresholds: [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 400,
      strategy: 'total'
    }]
  }
},
{
  title: '"total" strategy, success',
  expected: [],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 20
    },
    {
      filepath: 'vendor.js',
      size: 60
    }],
    failureThresholds: [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 80,
      strategy: 'total'
    }]
  }
},
{
  title: '"any" strategy, multiple targets, multiple failures',
  expected: [{
    offendingAssets: ['app.js']
  }, {
    offendingAssets: ['vendor.js']
  }],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 788
    },
    {
      filepath: 'vendor.js',
      size: 900
    }],
    failureThresholds: [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 400,
      strategy: 'any'
    }]
  }
},
{
  title: '"any" strategy, multiple targets, single fail',
  expected: [{
    offendingAssets: ['vendor.js']
  }],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 266
    },
    {
      filepath: 'vendor.js',
      size: 502
    }],
    failureThresholds: [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 400,
      strategy: 'any'
    }]
  }
},
{
  title: '"all" target',
  expected: [{
    offendingAssets: ['app.js']
  }, {
    offendingAssets: ['app.css']
  }],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 9000
    },
    {
      filepath: 'app.css',
      size: 5000
    }],
    failureThresholds: [{
      targets: 'all',
      maxSize: 40,
      strategy: 'any'
    }]
  }
},
{
  title: 'no thresholds or assetStats',
  expected: [],
  input: {
    assetStats: [],
    failureThresholds: []
  }
},
{
  title: 'no matching asset',
  expected: actual => {
    expect(actual.left().constructor).toBe(InvalidFailureThresholdErr);
  },
  input: {
    assetStats: [{
      filepath: 'uhuh.js',
      size: 3532
    }],
    failureThresholds: [{
      targets: 'nope.js',
      maxSize: 200,
      strategy: 'any'
    }]
  }
},
{
  title: 'file extension target',
  expected: [{
    offendingAssets: ['app.js']
  },
  {
    offendingAssets: ['vendor.js']
  }],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 300
    },
    {
      filepath: 'vendor.js',
      size: 400
    },
    {
      filepath: 'app.css',
      size: 700
    }],
    failureThresholds: [{
      targets: '.js',
      maxSize: 200,
      strategy: 'any'
    }]
  }
},
{
  title: 'target overlap',
  expected: [{
    offendingAssets: ['app.js']
  }],
  input: {
    assetStats: [{
      filepath: 'app.js',
      size: 300
    }],
    failureThresholds: [{
      targets: ['.js', 'app.js'],
      maxSize: 200,
      strategy: 'total'
    }]
  }
}];

R.forEach(
  ({expected: expecteds, input, title}) => {
    test(title, () => {
      const actuals = subject(input);
      if(R.type(expecteds) === 'Function') {
        expecteds(actuals);
      } else {
        expect(actuals.right().length).toBe(expecteds.length);

        R.forEach(
          ([actual, expected]) =>
            expect(actual.offendingAssets).toEqual(expected.offendingAssets),
          R.zip(actuals.right(), expecteds)
        );
      }
    });
  },
  testSets
);
