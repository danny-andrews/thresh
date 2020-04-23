import test from 'ava';
import expect, {createSpy} from 'expect';

import writeTargetDiffs from '../write-target-diffs';
import {TargetDiffsWriteErr} from '../../core/errors';

const subject = ({
  writeFile = () => Promise.resolve(),
  resolve = (...args) => args.join('/'),
  rootPath = 'root',
  targetDiffs = {},
  thresholdFailures = {}
} = {}) => writeTargetDiffs({
  rootPath,
  targetDiffs,
  thresholdFailures
}).run({writeFile, resolve});

test('writes target stats file', () => {
  const writeFileSpy = createSpy().andReturn(Promise.resolve());
  const diffs = {
    'app.css': {
      current: 52336,
      previous: 52336,
      difference: 0,
      percentChange: 0
    }
  };
  const failures = [{
    message: 'app.css should be less than 3MB',
    offendingTargets: ['app.css']
  }];

  return subject({
    rootPath: 'dist',
    targetDiffs: diffs,
    thresholdFailures: failures,
    writeFile: writeFileSpy
  }).then(() => {
    expect(writeFileSpy).toHaveBeenCalledWith(
      'dist/thresh/target-diffs.json',
      JSON.stringify({diffs, failures}, null, 2)
    );
  });
});

test('returns error when an error is encountered writing target diffs file', () => subject({
  writeFile: () => Promise.reject(Error())
}).catch(({message, constructor}) => {
  expect(message).toEqual('Error writing target diffs artifact');
  expect(constructor).toEqual(TargetDiffsWriteErr);
}));
