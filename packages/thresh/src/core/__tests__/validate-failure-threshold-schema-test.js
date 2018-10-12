import test from 'ava';
import expect from 'expect';

import subject from '../validate-failure-threshold-schema';
import {InvalidFailureThresholdOptionErr} from '../errors';

test("returns error when object doesn't match schema", () => {
  const actual = subject([{maxSize: 'not a number'}]).left();

  expect(actual.constructor).toBe(InvalidFailureThresholdOptionErr);
  expect(actual.message).toBe("'failure-thresholds' option is invalid. Problem(s): data[0].maxSize should be number");
});

test('returns success when object matches schema', () => {
  const actual = subject([{maxSize: 5666}]).right();

  expect(actual).toBe(true);
});
