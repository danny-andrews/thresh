import test from 'ava';
import expect from 'expect';

import readManifest from '../read-manifest';
import {PromiseError} from '../../test/helpers';
import {ManifestFileReadErr, ManifestFileParseErr} from '../../core/errors';

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
  readFile: () => PromiseError()
}).catch(({message, constructor}) => {
  expect(message).toEqual('Error reading manifest file');
  expect(constructor).toEqual(ManifestFileReadErr);
}));

test('returns ManifestFileParseErr when an error is encountered parsing stats file contents', () => subject({
  writeFile: () => Promise.resolve()
}).catch(({message, constructor}) => {
  expect(message).toEqual('Error parsing manifest file');
  expect(constructor).toEqual(ManifestFileParseErr);
}));
