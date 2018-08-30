import test from 'ava';
import expect, {createSpy} from 'expect';

import makeArtifactDirectory from '../make-artifact-directory';
import {ErrorCreatingArtifactDirectoryErr} from '../../core/errors';

const subject = ({
  mkdir = () => Promise.resolve(),
  resolve = (...args) => args.join('/'),
  rootPath = 'root'
} = {}) => makeArtifactDirectory({rootPath}).run({mkdir, resolve});

test('makes artifact directory', () => {
  const mkdirSpy = createSpy().andReturn(Promise.resolve());

  return subject({
    rootPath: 'dist',
    mkdir: mkdirSpy
  }).then(() => {
    expect(mkdirSpy).toHaveBeenCalledWith('dist/thresh');
  });
});

test('returns ErrorCreatingArtifactDirectoryErr when an error is encountered creating directory', () => {
  subject({mkdir: () => Promise.reject(Error('oh no'))}).catch(err => {
    expect(err).toEqual(ErrorCreatingArtifactDirectoryErr());
  });
});
