import test from 'ava';
import expect from 'expect';

import subject from '../validate-threshold-schema';
import {InvalidThresholdOptionErr} from '../errors';

test("returns error when object doesn't match schema", () => {
  const actual = subject([{maxSize: 'not a number', targets: 'dist/app.js'}]).left();

  expect(actual.constructor).toBe(InvalidThresholdOptionErr);
  expect(actual.message).toBe("'thresholds' option is invalid. Problem(s): data[0].maxSize should be number");
});

test('returns success when object matches schema', () => {
  const thresholds = [
    {maxSize: 5666, targets: ['dist/*.js']}
  ];
  const actual = subject(thresholds).right();

  expect(actual).toEqual(thresholds);
});

test('converts targets into array if needed', () => {
  const thresholds = [{
    maxSize: 323,
    targets: 'dist/*.js'
  }];
  const actual = subject(thresholds).right();

  expect(actual).toEqual([
    {maxSize: 323, targets: ['dist/*.js']}
  ]);
});
