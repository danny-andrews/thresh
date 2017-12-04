import test from 'ava';
import expect, {createSpy} from 'expect';
import writeBundleDiffs from '../write-bundle-diffs';
import {ErrorWritingBundleDiffArtifactErr} from '../../core/errors';

const subject = ({
  writeFile = () => Promise.resolve(),
  resolve = (...args) => args.join('/'),
  rootPath = 'root',
  projectName = 'project',
  bundleDiffs = {},
  thresholdFailures = {}
} = {}) => writeBundleDiffs({
  rootPath,
  projectName,
  bundleDiffs,
  thresholdFailures
}).run({writeFile, resolve});

test('writes bundle diffs file', () => {
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
    projectName: 'my-proj',
    bundleDiffs: diffs,
    thresholdFailures: failures,
    writeFile: writeFileSpy
  }).then(() => {
    expect(writeFileSpy).toHaveBeenCalledWith(
      'dist/circleci-weigh-in/my-proj/bundle-sizes-diff.json',
      JSON.stringify({diffs, failures}, null, 2)
    );
  });
});

test('returns ErrorWritingBundleDiffArtifactErr when an error is encountered writing bundle diffs file', () =>
  subject({writeFile: () => Promise.reject('oh no')}).catch(err => {
    expect(err).toEqual(ErrorWritingBundleDiffArtifactErr('oh no'));
  })
);
