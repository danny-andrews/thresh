import test from 'ava';
import expect from 'expect';
import R from 'ramda';

import {InvalidThresholdErr} from '../errors';
import subject from '../get-threshold-failures';

const testSets = [
  {
    title: 'singleton target, target with size > maxSize',
    input: [
      {resolvedTargets: ['app.js'], maxSize: 2, size: 35}
    ],
    output: [
      {offendingTargets: ['app.js']}
    ]
  },
  {
    title: 'target with size < maxSize',
    input: [
      {resolvedTargets: ['app.js'], maxSize: 80, size: 21}
    ],
    output: []
  },
  {
    title: 'target with size === maxSize',
    input: [
      {resolvedTargets: ['app.js'], maxSize: 80, size: 80}
    ],
    output: []
  },
  {
    title: 'failure with multiple targets',
    input: [
      {resolvedTargets: ['app.js', 'vendor.js'], maxSize: 400, size: 489}
    ],
    output: [
      {offendingTargets: ['app.js', 'vendor.js']}
    ]
  },
  {
    title: 'success with multiple targets',
    input: [
      {resolvedTargets: ['app.js', 'vendor.js'], maxSize: 80, size: 80}
    ],
    output: []
  },
  {
    title: 'multiple targets, multiple failures',
    input: [
      {resolvedTargets: ['app.js'], maxSize: 400, size: 788},
      {resolvedTargets: ['vendor.js'], maxSize: 400, size: 900}
    ],
    output: [
      {offendingTargets: ['app.js']},
      {offendingTargets: ['vendor.js']}
    ]
  },
  {
    title: 'multiple targets, single fail',
    input: [
      {resolvedTargets: ['app.js'], maxSize: 400, size: 266},
      {resolvedTargets: ['vendor.js'], maxSize: 400, size: 502}
    ],
    output: [
      {offendingTargets: ['vendor.js']}
    ]
  },
  {
    title: 'no thresholds or targetStats',
    input: [],
    output: []
  },
  {
    title: 'no matching target',
    input: [
      {resolvedTargets: [], maxSize: 200, size: 3532}
    ],
    output: actual => {
      expect(actual.left().constructor).toBe(InvalidThresholdErr);
    }
  }
];

R.forEach(
  ({output: expecteds, input, title}) => {
    test(title, () => {
      const actuals = subject(input);
      if(R.is(Function, expecteds)) {
        expecteds(actuals);
      } else {
        expect(actuals.right().length).toBe(expecteds.length);

        R.forEach(
          ([actual, expected]) =>
            expect(actual.offendingTargets).toEqual(expected.offendingTargets),
          R.zip(actuals.right(), expecteds)
        );
      }
    });
  },
  testSets
);
