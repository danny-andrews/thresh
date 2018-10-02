import test from 'ava';
import expect from 'expect';

import readManifest from '../read-manifest';
import {PromiseError} from '../../test/helpers';
import {ManifestFileReadErr} from '../../core/errors';

const subject = ({
  readFile = () => Promise.resolve(),
  manifestFilepath = 'dist/stats.json'
} = {}) => readManifest(manifestFilepath).run({readFile});

test('returns parsed contents of stats file', () => subject({
  readFile: () => Promise.resolve('"blah blah"')
}).then(contents => {
  expect(contents).toBe('blah blah');
}));

test('returns ManifestFileReadErr when an error is encountered reading stats file', () => subject({
  readFile: () => PromiseError('oh no')
}).catch(({message, constructor}) => {
  expect(message).toEqual(ManifestFileReadErr('Error: oh no').message);
  expect(constructor).toEqual(ManifestFileReadErr);
}));

test('returns ManifestFileReadErr when an error is encountered parsing stats file contents', () => subject({
  writeFile: () => Promise.resolve('no valid JSON')
}).catch(({message, constructor}) => {
  expect(message).toEqual(ManifestFileReadErr('SyntaxError: Unexpected token u in JSON at position 0').message);
  expect(constructor).toEqual(ManifestFileReadErr);
}));
