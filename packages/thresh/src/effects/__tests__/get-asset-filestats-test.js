import test from 'ava';
import expect from 'expect';

import {AssetFileStatReadErr} from '../../core/errors';
import getAssetFilestats from '../get-asset-filestats';

const subject = ({
  getFileStats = () => Promise.resolve({size: 200}),
  stats = [{path: 'my-stats.json'}]
} = {}) => getAssetFilestats(stats).run({getFileStats});

test('returns stat with file size', () => subject({
  getFileStats: () => Promise.resolve({size: 400}),
  stats: [{path: 'filestats.json'}]
}).then(stats => {
  expect(stats).toEqual([{path: 'filestats.json', size: 400}]);
}));

test('returns AssetFileStatReadErr stat with file size', () => subject({
  getFileStats: () => Promise.reject(Error()),
  stats: [{path: 'filestats.json'}]
}).catch(({constructor, message}) => {
  expect(constructor).toBe(AssetFileStatReadErr);
  expect(message).toBe('Error reading asset file stat: filestats.json');
}));
