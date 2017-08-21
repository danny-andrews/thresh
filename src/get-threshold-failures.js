import R from 'ramda';
import {sprintf} from 'sprintf-js';
import filesize from 'filesize';
import {
  FAILURE_THRESHOLD_TARGET_ALL,
  FailureThresholdStategies
} from './constants';
import {InvalidFailureThresholdError} from './errors';
import {unthrow} from './util';

const uncheckedGetThresholdFailures = ({assetStats, failureThresholds}) => {
  const isFileExtensionTarget = target => target[0] === '.';
  const isAllTarget = target => target === FAILURE_THRESHOLD_TARGET_ALL;
  const assetStatsWithExt = target => assetStats.filter(
    ({filepath}) => new RegExp(`${target}$`).test(filepath)
  );
  const assetStatsWithFilePath = target => assetStats.filter(({filepath}) =>
    filepath === target);
  const formatFilesize = size => filesize(size, {spacer: ''});

  return R.chain(
    threshold => {
      const {targets, maxSize, strategy} = threshold;
      const isWithinThreshold = R.gte(maxSize);
      const buildFailureObject = ({message, offendingAssets}) => ({
        message,
        threshold,
        offendingAssets: offendingAssets.map(({filepath}) => filepath)
      });
      const anyStrategy = R.chain(asset => {
        if(isWithinThreshold(asset.size)) {
          return [];
        }

        const message = sprintf(
          '"%s" (%s) must be less than or equal to %s!',
          asset.filepath,
          formatFilesize(asset.size),
          formatFilesize(maxSize),
        );

        return buildFailureObject({message, offendingAssets: [asset]});
      });
      const allStrategy = targetSet => {
        const total =
          R.reduce((accSize, {size}) => accSize + size, 0, targetSet);
        if(isWithinThreshold(total)) {
          return [];
        }

        const offendingAssetPaths = targetSet
          .map(({filepath}) => `"${filepath}"`).join(', ');

        const message = sprintf(
          'The total size of [%s] (%s) must be less than or equal to %s!',
          offendingAssetPaths,
          formatFilesize(total),
          formatFilesize(maxSize),
        );

        return buildFailureObject({message, offendingAssets: targetSet});
      };

      return R.pipe(
        target => [].concat(target),
        R.chain(target => {
          const targetSet = R.cond([
            [isFileExtensionTarget, assetStatsWithExt],
            [isAllTarget, R.always(assetStats)],
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
export default unthrow(
  uncheckedGetThresholdFailures,
  error => !R.is(InvalidFailureThresholdError, error)
);
