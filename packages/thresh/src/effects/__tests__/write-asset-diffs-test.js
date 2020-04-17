import test from 'ava';
import expect, {createSpy} from 'expect';

import writeAssetDiffs from '../write-asset-diffs';
import {AssetDiffsWriteErr} from '../../core/errors';

const subject = ({
  writeFile = () => Promise.resolve(),
  resolve = (...args) => args.join('/'),
  rootPath = 'root',
  assetDiffs = {},
  thresholdFailures = {}
} = {}) => writeAssetDiffs({
  rootPath,
  assetDiffs,
  thresholdFailures
}).run({writeFile, resolve});

test('writes asset stats file', () => {
  const writeFileSpy = createSpy().andReturn(Promise.resolve());
  const diffs = {
    'app.css': {
      current: 52336,
      original: 52336,
      difference: 0,
      percentChange: 0
    }
  };
  const failures = [{
    message: 'app.css should be less than 3MB',
    offendingAssets: ['app.css']
  }];

  return subject({
    rootPath: 'dist',
    assetDiffs: diffs,
    thresholdFailures: failures,
    writeFile: writeFileSpy
  }).then(() => {
    expect(writeFileSpy).toHaveBeenCalledWith(
      'dist/thresh/target-diffs.json',
      JSON.stringify({diffs, failures}, null, 2)
    );
  });
});

test('returns error when an error is encountered writing asset diffs file', () => subject({
  writeFile: () => Promise.reject(Error())
}).catch(({message, constructor}) => {
  expect(message).toEqual('Error writing asset diffs artifact');
  expect(constructor).toEqual(AssetDiffsWriteErr);
}));
