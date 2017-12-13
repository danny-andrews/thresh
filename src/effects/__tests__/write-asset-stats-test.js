import test from 'ava';
import expect, {createSpy} from 'expect';
import writeAssetStats from '../write-asset-stats';
import {ErrorWritingAssetSizesArtifactErr} from '../../core/errors';

const subject = ({
  writeFile = () => Promise.resolve(),
  resolve = (...args) => args.join('/'),
  rootPath = 'root',
  assetStats = {}
} = {}) => writeAssetStats({rootPath, assetStats})
  .run({writeFile, resolve});

test('writes asset stats file', () => {
  const writeFileSpy = createSpy().andReturn(Promise.resolve());

  return subject({
    rootPath: 'dist',
    assetStats: {
      'app.css': {
        size: 213,
        path: 'app.css'
      }
    },
    writeFile: writeFileSpy
  }).then(() => {
    expect(writeFileSpy).toHaveBeenCalledWith(
      'dist/circleci-weigh-in/asset-stats.json',
      JSON.stringify({
        'app.css': {
          size: 213,
          path: 'app.css'
        }
      }, null, 2)
    );
  });
});

test('returns error when an error is encountered writing asset stats file', () =>
  subject({writeFile: () => Promise.reject('oh no')}).catch(err => {
    expect(err).toEqual(ErrorWritingAssetSizesArtifactErr('oh no'));
  })
);
