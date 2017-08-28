import test from 'ava';
import expect, {createSpy} from 'expect';
import subject from '../diff-bundles';

const bundleFac = (opts = {}) => ({
  size: 24,
  ...opts
});

const FLOAT_PERCISION = 0.000001;

test('empty objects', () => {
  const actual = subject({
    current: {},
    original: {}
  });

  expect(actual).toEqual({});
});

test('calculates stats properly', () => {
  const actual = subject({
    current: {
      'asset1.js': bundleFac({size: 5}),
      'asset2.js': bundleFac({size: 80})
    },
    original: {
      'asset1.js': bundleFac({size: 4}),
      'asset2.js': bundleFac({size: 100})
    }
  });

  expect(actual).toMatch({
    'asset1.js': {
      current: 5,
      original: 4,
      difference: 1
    },
    'asset2.js': {
      current: 80,
      original: 100,
      difference: -20
    }
  });
  expect(actual['asset1.js'].percentChange - 25)
    .toBeLessThan(FLOAT_PERCISION);
  expect(actual['asset2.js'].percentChange - (-20))
    .toBeLessThan(FLOAT_PERCISION);
});

test('calculates diff correctly even when mismatch found', () => {
  const actual = subject({
    current: {
      'asset1.js': bundleFac({size: 6}),
      'asset2.js': bundleFac({size: 424})
    },
    original: {
      'asset1.js': bundleFac({size: 16})
    }
  });

  expect(actual).toMatch({
    'asset1.js': {
      current: 6,
      original: 16,
      difference: -10
    }
  });
  expect(actual['asset1.js'].percentChange - 0.625)
    .toBeLessThan(FLOAT_PERCISION);
});

test('calls onMismatchFound for every mismatch found', () => {
  const spy = createSpy();
  subject({
    current: {'new-asset.js': bundleFac(), 'new-asset.css': bundleFac()},
    original: {},
    onMismatchFound: spy
  });

  expect(spy.calls.length).toBe(2);
  expect(spy).toHaveBeenCalledWith('new-asset.js');
  expect(spy).toHaveBeenCalledWith('new-asset.css');
});
