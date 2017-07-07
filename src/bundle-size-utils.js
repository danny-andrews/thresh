import {map, toPairs} from 'ramda';
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
  toPairs(webpackStats.assetsByChunkName)
    .reduce(
      (acc, [chunkName, filepaths]) => ({
        ...acc,
        ...flattenChunkAssets({chunkName, filepaths})
      }),
      {}
    );

export const bundleSizesFromWebpackStats = webpackStats =>
  map(filepath => {
    const assetStats = webpackStats.assets.find(({name}) => name === filepath);

    if(!assetStats) {
      throw new Error(
        `Could not find ${filepath} listed in given webpack stats!`
      );
    }

    return {size: assetStats.size, path: filepath};
  }, assetsByFilename(webpackStats));

export const diffBundles = ({current, original}) =>
  toPairs(current).reduce(
    (acc, [filename, fileStats]) => {
      const originalStat = original[filename];
      const difference = fileStats.size - originalStat.size;

      return originalStat
        ? {
          ...acc, [filename]: {
            current: fileStats.size,
            original: originalStat.size,
            difference,
            // eslint-disable-next-line no-magic-numbers
            percentChange: difference / originalStat.size * 100
          }
        }
        : acc;
    },
    {}
  );
