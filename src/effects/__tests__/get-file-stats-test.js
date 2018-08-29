import test from 'ava';
import expect from 'expect';
import getAssetFileStats from '../get-asset-file-stats';

const subject = ({
  getFileStats = () => Promise.resolve({size: 200}),
  stats = [{path: 'my-stats.json'}]
} = {}) => getAssetFileStats(stats).run({getFileStats});

test('returns stat with file size', () => {
  subject({
    getFileStats: () => Promise.resolve({size: 400}),
    stats: [{path: 'filestats.json'}]
  }).then(stats => {
    expect(stats).toEqual([{path: 'filestats.json', size: 400}]);
  });
});
