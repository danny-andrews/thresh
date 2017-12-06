import test from 'ava';
import expect from 'expect';
import subject from '../format-asset-diff';

test('no difference', () => {
  const actual = subject({
    filename: 'app.js',
    difference: 0,
    current: 3523,
    percentChange: 0
  });

  expect(actual).toEqual('app.js: 3.44KB (No Change)');
});

test('positive difference', () => {
  const actual = subject({
    filename: 'app.js',
    difference: 23,
    current: 95842,
    percentChange: 0.02
  });

  expect(actual).toEqual('app.js: 93.6KB (+23B, +0.02%)');
});

test('negative difference', () => {
  const actual = subject({
    filename: 'app.js',
    difference: -352,
    current: 9423,
    percentChange: -3.60
  });

  expect(actual).toEqual('app.js: 9.2KB (-352B, -3.60%)');
});

test('rounds percent change to 2 decimal points', () => {
  const actual = subject({
    filename: 'app.js',
    difference: -734729,
    current: 5364634,
    percentChange: -12.046
  });

  expect(actual).toEqual('app.js: 5.12MB (-717KB, -12.05%)');
});

test("pads with 0's to 2 decimal points", () => {
  const actual = subject({
    filename: 'app.js',
    difference: 839,
    current: 4336,
    percentChange: 24
  });

  expect(actual).toEqual('app.js: 4.23KB (+839B, +24.00%)');
});
