import test from 'ava';
import expect from 'expect';

import subject from '../diff-assets';

const FLOAT_PERCISION = 0.000001;

test('empty', () => {
  const actual = subject([], []);

  expect(actual).toEqual([[], []]);
});

test('calculates stats properly', () => {
  const [diffs, mismatchedTargetSets] = subject(
    [
      {targets: ['asset1.js'], resolvedTargets: ['asset1.js'], size: 5},
      {targets: ['asset2.js'], resolvedTargets: ['asset2.js'], size: 80}
    ],
    [
      {filepath: 'asset1.js', size: 4},
      {filepath: 'asset2.js', size: 100}
    ]
  );

  expect(diffs).toMatch([
    {
      targets: ['asset1.js'],
      current: 5,
      original: 4,
      difference: 1
    },
    {
      targets: ['asset2.js'],
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
      {targets: ['asset1.js'], resolvedTargets: ['asset1.js'], size: 6},
      {targets: ['asset2.js'], resolvedTargets: ['asset2.js'], size: 424}
    ],
    [
      {filepath: 'asset1.js', size: 16}
    ]
  );

  expect(diffs).toMatch([
    {
      targets: ['asset1.js'],
      current: 6,
      original: 16,
      difference: -10
    }
  ]);
  expect(diffs[0].percentChange - 0.625)
    .toBeLessThan(FLOAT_PERCISION);
  expect(mismatchedTargetSets).toEqual([['asset2.js']]);
});

test('calculates mismatches correctly', () => {
  const [, mismatchedTargetSets] = subject(
    [
      {
        targets: ['new-asset.js'],
        resolvedTargets: ['new-asset.js'],
        size: 37
      },
      {
        targets: ['new-asset.css'],
        resolvedTargets: ['new-asset.css'],
        size: 200
      }
    ],
    [],
  );

  expect(mismatchedTargetSets).toEqual([['new-asset.js'], ['new-asset.css']]);
});
