import test from 'ava';
import expect from 'expect';

import {FileSizeReadErr} from '../../core/errors';
import getAssetFilestats from '../get-file-sizes';

const subject = ({
  getFileStats = () => Promise.resolve({size: 200}),
  filepaths = []
} = {}) => getAssetFilestats(filepaths).run({getFileStats});

test('returns filepath with file size', () => subject({
  getFileStats: () => Promise.resolve({size: 400}),
  filepaths: ['dist/app.css']
}).then(stats => {
  expect(stats).toEqual([{filepath: 'dist/app.css', size: 400}]);
}));

test('returns FileSizeReadErr filepath with file size', () => subject({
  getFileStats: () => Promise.reject(Error()),
  filepaths: ['dist/app.js']
}).catch(({constructor, message}) => {
  expect(constructor).toBe(FileSizeReadErr);
  expect(message).toBe('Error reading file size for file: dist/app.js');
}));
