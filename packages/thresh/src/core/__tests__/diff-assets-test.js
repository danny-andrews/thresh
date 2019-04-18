import test from 'ava';
import expect, {createSpy} from 'expect';

import subject from '../diff-assets';

const FLOAT_PERCISION = 0.000001;

test('empty', () => {
  const actual = subject([], []);

  expect(actual).toEqual([]);
});

test('calculates stats properly', () => {
  const actual = subject(
    [
      {targets: ['asset1.js'], resolvedTargets: ['asset1.js'], size: 5},
      {targets: ['asset2.js'], resolvedTargets: ['asset2.js'], size: 80}
    ],
    [
      {filepath: 'asset1.js', size: 4},
      {filepath: 'asset2.js', size: 100}
    ]
  );

  expect(actual).toMatch([
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
  expect(actual[0].percentChange - 25)
    .toBeLessThan(FLOAT_PERCISION);
  expect(actual[1].percentChange - (-20))
    .toBeLessThan(FLOAT_PERCISION);
});

test('calculates diff correctly even when mismatch found', () => {
  const actual = subject(
    [
      {targets: ['asset1.js'], resolvedTargets: ['asset1.js'], size: 6},
      {targets: ['asset2.js'], resolvedTargets: ['asset2.js'], size: 424}
    ],
    [
      {filepath: 'asset1.js', size: 16}
    ]
  );

  expect(actual).toMatch([
    {
      targets: ['asset1.js'],
      current: 6,
      original: 16,
      difference: -10
    }
  ]);
  expect(actual[0].percentChange - 0.625)
    .toBeLessThan(FLOAT_PERCISION);
});

test('calls onMismatchFound for every mismatch found', () => {
  const spy = createSpy();
  subject(
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
    {onMismatchFound: spy}
  );

  expect(spy.calls.length).toBe(2);
  expect(spy).toHaveBeenCalledWith(['new-asset.js']);
  expect(spy).toHaveBeenCalledWith(['new-asset.css']);
});
