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
  args: [
    [{
      filepath: 'app.js',
      size: 35
    }],
    [{
      targets: 'app.js',
      maxSize: 2,
      strategy: 'any'
    }]
  ]
},
{
  title: 'asset with size < maxSize',
  expected: [],
  args: [
    [{
      filepath: 'app.js',
      size: 21
    }],
    [{
      targets: 'app.js',
      maxSize: 80,
      strategy: 'any'
    }]
  ]
},
{
  title: 'asset with size === maxSize',
  expected: [],
  args: [
    [{
      filepath: 'app.js',
      size: 80,
      strategy: 'any'
    }],
    [{
      targets: 'app.js',
      maxSize: 80
    }]
  ]
},
{
  title: '"total" strategy, failure',
  expected: [{
    offendingAssets: ['app.js', 'vendor.js']
  }],
  args: [
    [{
      filepath: 'app.js',
      size: 34
    },
    {
      filepath: 'vendor.js',
      size: 455
    }],
    [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 400,
      strategy: 'total'
    }]
  ]
},
{
  title: '"total" strategy, success',
  expected: [],
  args: [
    [{
      filepath: 'app.js',
      size: 20
    },
    {
      filepath: 'vendor.js',
      size: 60
    }],
    [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 80,
      strategy: 'total'
    }]
  ]
},
{
  title: '"any" strategy, multiple targets, multiple failures',
  expected: [{
    offendingAssets: ['app.js']
  }, {
    offendingAssets: ['vendor.js']
  }],
  args: [
    [{
      filepath: 'app.js',
      size: 788
    },
    {
      filepath: 'vendor.js',
      size: 900
    }],
    [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 400,
      strategy: 'any'
    }]
  ]
},
{
  title: '"any" strategy, multiple targets, single fail',
  expected: [{
    offendingAssets: ['vendor.js']
  }],
  args: [
    [{
      filepath: 'app.js',
      size: 266
    },
    {
      filepath: 'vendor.js',
      size: 502
    }],
    [{
      targets: ['app.js', 'vendor.js'],
      maxSize: 400,
      strategy: 'any'
    }]
  ]
},
{
  title: '"all" target',
  expected: [{
    offendingAssets: ['app.js']
  }, {
    offendingAssets: ['app.css']
  }],
  args: [
    [{
      filepath: 'app.js',
      size: 9000
    },
    {
      filepath: 'app.css',
      size: 5000
    }],
    [{
      targets: 'all',
      maxSize: 40,
      strategy: 'any'
    }]
  ]
},
{
  title: 'no thresholds or assetStats',
  expected: [],
  args: [
    [],
    []
  ]
},
{
  title: 'no matching asset',
  expected: actual => {
    expect(actual.left().constructor).toBe(InvalidFailureThresholdErr);
  },
  args: [
    [{
      filepath: 'uhuh.js',
      size: 3532
    }],
    [{
      targets: 'nope.js',
      maxSize: 200,
      strategy: 'any'
    }]
  ]
},
{
  title: 'file extension target',
  expected: [{
    offendingAssets: ['app.js']
  },
  {
    offendingAssets: ['vendor.js']
  }],
  args: [
    [{
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
    [{
      targets: '.js',
      maxSize: 200,
      strategy: 'any'
    }]
  ]
},
{
  title: 'target overlap',
  expected: [{
    offendingAssets: ['app.js']
  }],
  args: [
    [{
      filepath: 'app.js',
      size: 300
    }],
    [{
      targets: ['.js', 'app.js'],
      maxSize: 200,
      strategy: 'total'
    }]
  ]
}];

R.forEach(
  ({expected: expecteds, args, title}) => {
    test(title, () => {
      const actuals = subject(...args);
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
