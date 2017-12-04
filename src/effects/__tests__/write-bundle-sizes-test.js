import test from 'ava';
import expect, {createSpy} from 'expect';
import writeBundleSizes from '../write-bundle-sizes';
import {ErrorWritingBundleSizeArtifactErr} from '../../core/errors';

const subject = ({
  writeFile = () => Promise.resolve(),
  resolve = (...args) => args.join('/'),
  rootPath = 'root',
  projectName = 'project',
  bundleSizes = {}
} = {}) => writeBundleSizes({rootPath, projectName, bundleSizes})
  .run({writeFile, resolve});

test('writes bundle sizes file', () => {
  const writeFileSpy = createSpy().andReturn(Promise.resolve());

  return subject({
    rootPath: 'dist',
    projectName: 'my-proj',
    bundleSizes: {
      'app.css': {
        size: 213,
        path: 'app.css'
      }
    },
    writeFile: writeFileSpy
  }).then(() => {
    expect(writeFileSpy).toHaveBeenCalledWith(
      'dist/circleci-weigh-in/my-proj/bundle-sizes.json',
      JSON.stringify({
        'app.css': {
          size: 213,
          path: 'app.css'
        }
      }, null, 2)
    );
  });
});

test('returns ErrorWritingBundleSizeArtifactErr when an error is encountered writing bundle sizes file', () =>
  subject({writeFile: () => Promise.reject('oh no')}).catch(err => {
    expect(err).toEqual(ErrorWritingBundleSizeArtifactErr('oh no'));
  })
);
