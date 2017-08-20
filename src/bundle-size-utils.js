import R from 'ramda';
import path from 'path';
import {
  FAILURE_THRESHOLD_TARGET_ALL,
  FailureThresholdStategies
} from './constants';
import {InvalidFailureThresholdError} from './errors';
import {unthrow} from './util';

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

export const diffBundles = ({current, original}) =>
  R.toPairs(current).reduce(
    (acc, [filename, fileStats]) => {
      const originalStat = original[filename];
      const difference = fileStats.size - originalStat.size;

      return originalStat
        ? {
          ...acc,
          [filename]: {
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

const uncheckedGetThresholdFailures = ({assetStats, failureThresholds}) => {
  const isFileExtensionTarget = target => target[0] === '.';
  const isAllTarget = target => target === FAILURE_THRESHOLD_TARGET_ALL;
  const assetStatsWithExt = target => assetStats.filter(
    ({filepath}) => new RegExp(`${target}$`).test(filepath)
  );
  const assetStatsWithFilePath = target => assetStats.filter(({filepath}) =>
    filepath === target);

  return R.chain(
    threshold => {
      const {targets, maxSize, strategy} = threshold;
      const isWithinThreshold = R.gt(maxSize);
      const buildFailureObject = ({message, assets}) => ({
        message,
        threshold,
        offendingAssets: [].concat(assets)
      });
      const anyStrategy = R.chain(asset => {
        if(isWithinThreshold(asset.size)) {
          return [];
        }

        return buildFailureObject({
          message: `Asset ${asset.filepath} size (${asset.size}) is above the \
maximum allowed (${maxSize}) by one of your failure thresholds`,
          assets: asset
        });
      });
      const allStrategy = targetSet => {
        const total =
          R.reduce((accSize, {size}) => accSize + size, 0, targetSet);
        if(isWithinThreshold(total)) {
          return [];
        }

        const offendingAssetPaths = targetSet.map(({filepath}) => filepath);

        return buildFailureObject({
          message: `The total size of assets \
[${offendingAssetPaths.join(',')}] (${total}) is above the maximum \
(${maxSize}) allowed by one of your failure thresholds`,
          assets: targetSet
        });
      };

      return R.pipe(
        target => [].concat(target),
        R.chain(target => {
          const targetSet = R.cond([
            [isFileExtensionTarget, assetStatsWithExt],
            [isAllTarget, assetStats],
            [R.T, assetStatsWithFilePath]
          ])(target);

          if(R.isEmpty(targetSet)) {
            // Wouldn't normally throw in a helper method, but it's the only way
            //   to exit a non-for-loop.
            throw new InvalidFailureThresholdError(
              `Invalid failure threshold provided. No targets found for target:
                [${target}]`
            );
          }

          return targetSet;
        }),
        R.uniq,
        strategy === FailureThresholdStategies.ANY ? anyStrategy : allStrategy
      )(targets);
    },
    failureThresholds
  );
};

// Just wrap uncheckedGetThresholdFailures and return Error object rather than
//   rely on exception bubbling.
export const getThresholdFailures = unthrow(
  uncheckedGetThresholdFailures,
  error => !R.is(InvalidFailureThresholdError, error)
);
