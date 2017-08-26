import R from 'ramda';
import path from 'path';

const flattenChunkAssets = ({chunkName, filepaths}) =>
  [].concat(filepaths)
    .reduce(
      (acc, filepath) => ({
        ...acc,
        [chunkName + path.extname(filepath)]: filepath
      }),
      {}
    );

const assetsByFilename = webpackStats =>
  R.toPairs(webpackStats.assetsByChunkName)
    .reduce(
      (acc, [chunkName, filepaths]) => ({
        ...acc,
        ...flattenChunkAssets({chunkName, filepaths})
      }),
      {}
    );

export const bundleSizesFromWebpackStats = webpackStats =>
  R.map(filepath => {
    const assetStats = webpackStats.assets.find(({name}) => name === filepath);

    if(!assetStats) {
      throw new Error(
        `Could not find ${filepath} listed in given webpack stats!`
      );
    }

    return {size: assetStats.size, path: filepath};
  }, assetsByFilename(webpackStats));

export const diffBundles = ({
  current,
  original,
  onMismatchFound = R.identity
}) => R.toPairs(current).reduce(
  (acc, [filepath, fileStats]) => {
    const originalStat = original[filepath];
    if(!originalStat) {
      onMismatchFound(filepath);

      return acc;
    }

    const difference = fileStats.size - originalStat.size;

    return {
      ...acc,
      [filepath]: {
        original: originalStat.size,
        current: fileStats.size,
        difference,
        // eslint-disable-next-line no-magic-numbers
        percentChange: difference / originalStat.size * 100
      }
    };
  },
  {}
);
