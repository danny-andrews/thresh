import test from 'ava';
import expect from 'expect';

import subject from '../diff-targets';

const FLOAT_PERCISION = 0.000001;

test('empty', () => {
  const actual = subject([], []);

  expect(actual).toEqual([[], []]);
});

test('calculates stats properly with globs', () => {
  const [diffs, mismatchedTargetSets] = subject(
    [
      {targets: ['*.js'], resolvedTargets: ['app.js', 'vendor.js'], size: 300},
      {targets: ['vendor.js'], resolvedTargets: ['vendor.js'], size: 80}
    ],
    [
      {filepath: 'app.js', size: 100},
      {filepath: 'vendor.js', size: 100}
    ]
  );

  expect(diffs).toMatch([
    {
      targets: ['*.js'],
      current: 300,
      previous: 200,
      difference: 100
    },
    {
      targets: ['vendor.js'],
      current: 80,
      previous: 100,
      difference: -20
    }
  ]);
  expect(diffs[0].percentChange - 50).toBeLessThan(FLOAT_PERCISION);
  expect(diffs[1].percentChange - (-20)).toBeLessThan(FLOAT_PERCISION);
  expect(mismatchedTargetSets).toEqual([]);
});

test('calculates diff correctly even when mismatch found', () => {
  const [diffs, mismatchedTargetSets] = subject(
    [
      {targets: ['app.js'], resolvedTargets: ['app.js'], size: 6},
      {targets: ['app.css'], resolvedTargets: ['app.css', 'vendor.css'], size: 424}
    ],
    [
      {filepath: 'app.js', size: 16},
      {filepath: 'app.css', size: 50}
    ]
  );

  expect(diffs).toMatch([
    {
      targets: ['app.js'],
      current: 6,
      previous: 16,
      difference: -10
    }
  ]);
  expect(diffs[0].percentChange - 0.625)
    .toBeLessThan(FLOAT_PERCISION);
  expect(mismatchedTargetSets).toEqual([{
    targets: ['app.css'],
    previousTargets: ['app.css'],
    currentTargets: ['app.css', 'vendor.css']
  }]);
});
