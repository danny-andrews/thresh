import test from 'ava';
import expect from 'expect';
import subject from '../bundle-sizes-from-webpack-stats';
import {FilepathNotFoundInStatsErr} from '../errors';

test('full example', () => {
  const expected = {
    'app.js': {size: 452, path: 'dist/app.js'},
    'vendor.js': {size: 64326, path: 'dist/vendor.js'},
    'vendor.css': {size: 532, path: 'dist/vendor.css'}
  };

  const actual = subject({
    assetsByChunkName: {
      app: 'dist/app.js',
      vendor: ['dist/vendor.js', 'dist/vendor.css']
    },
    assets: [
      {name: 'dist/app.js', size: 452},
      {name: 'dist/vendor.js', size: 64326},
      {name: 'dist/vendor.css', size: 532}
    ]
  });

  expect(actual).toEqual(expected);
});

test('no asset stat found', () => {
  const actual = subject({
    assetsByChunkName: {
      app: 'dist/app.js'
    },
    assets: [
      {name: 'dist/vendor.js', size: 64326}
    ]
  });

  expect(actual.length).toBe(1);
  expect(actual[0].constructor).toBe(FilepathNotFoundInStatsErr);
});

test('single chunk asset', () => {
  const expected = {
    'app.js': {size: 452, path: 'dist/app.js'}
  };

  const actual = subject({
    assetsByChunkName: {
      app: 'dist/app.js'
    },
    assets: [
      {name: 'dist/app.js', size: 452}
    ]
  });

  expect(actual).toEqual(expected);
});

test('multiple chunk assets', () => {
  const expected = {
    'vendor.js': {size: 64326, path: 'dist/vendor.js'},
    'vendor.css': {size: 532, path: 'dist/vendor.css'}
  };

  const actual = subject({
    assetsByChunkName: {
      vendor: ['dist/vendor.js', 'dist/vendor.css']
    },
    assets: [
      {name: 'dist/vendor.js', size: 64326},
      {name: 'dist/vendor.css', size: 532}
    ]
  });

  expect(actual).toEqual(expected);
});
