/* eslint-disable no-magic-numbers */
import test from 'ava';
import {getThresholdFailures} from './bundle-size-utils';

test('foo', t => {
  const assetStats = [{
    filepath: 'yoyo.js',
    size: 35
  },
  {
    filepath: 'hi.css',
    size: 500
  }];
  const failureThresholds = [{
    targets: 'yoyo.js',
    maxSize: 2,
    strategy: 'any'
  },
  {
    targets: '.css',
    maxSize: 20,
    strategy: 'any'
  }];
  const failures = getThresholdFailures({assetStats, failureThresholds});
  failures.forEach(failure => console.log(failure.message));
  t.is(failures.length, 1);
});
