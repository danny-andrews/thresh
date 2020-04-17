import test from 'ava';
import expect from 'expect';

import subject from '../diff-targets';

const FLOAT_PERCISION = 0.000001;

test('empty', () => {
  const actual = subject([], []);

  expect(actual).toEqual([[], []]);
});

test('calculates stats properly', () => {
  const [diffs, mismatchedTargetSets] = subject(
    [
      {targets: ['target1.js'], resolvedTargets: ['target1.js'], size: 5},
      {targets: ['target2.js'], resolvedTargets: ['target2.js'], size: 80}
    ],
    [
      {filepath: 'target1.js', size: 4},
      {filepath: 'target2.js', size: 100}
    ]
  );

  expect(diffs).toMatch([
    {
      targets: ['target1.js'],
      current: 5,
      original: 4,
      difference: 1
    },
    {
      targets: ['target2.js'],
      current: 80,
      original: 100,
      difference: -20
    }
  ]);
  expect(diffs[0].percentChange - 25).toBeLessThan(FLOAT_PERCISION);
  expect(diffs[1].percentChange - (-20)).toBeLessThan(FLOAT_PERCISION);
  expect(mismatchedTargetSets).toEqual([]);
});

test('calculates diff correctly even when mismatch found', () => {
  const [diffs, mismatchedTargetSets] = subject(
    [
      {targets: ['target1.js'], resolvedTargets: ['target1.js'], size: 6},
      {targets: ['target2.js'], resolvedTargets: ['target2.js'], size: 424}
    ],
    [
      {filepath: 'target1.js', size: 16}
    ]
  );

  expect(diffs).toMatch([
    {
      targets: ['target1.js'],
      current: 6,
      original: 16,
      difference: -10
    }
  ]);
  expect(diffs[0].percentChange - 0.625)
    .toBeLessThan(FLOAT_PERCISION);
  expect(mismatchedTargetSets).toEqual([['target2.js']]);
});

test('calculates mismatches correctly', () => {
  const [, mismatchedTargetSets] = subject(
    [
      {
        targets: ['new-target.js'],
        resolvedTargets: ['new-target.js'],
        size: 37
      },
      {
        targets: ['new-target.css'],
        resolvedTargets: ['new-target.css'],
        size: 200
      }
    ],
    []
  );

  expect(mismatchedTargetSets).toEqual([['new-target.js'], ['new-target.css']]);
});
