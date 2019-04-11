import R from 'ramda';
import {sprintf} from 'sprintf-js';
import filesize from 'filesize';
import {unthrow} from '@danny.andrews/fp-utils';

import {
  FAILURE_THRESHOLD_TARGET_ALL,
  FailureThresholdStategies
} from './constants';
import {InvalidFailureThresholdErr} from './errors';

const uncheckedGetThresholdFailures = (assetStats, failureThresholds) => {
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

      return [].concat(targets)
        |> R.chain(target => {
          const targetSet = R.cond([
            [isFileExtensionTarget, assetStatsWithExt],
            [isAllTarget, R.always(assetStats)],
            [R.T, assetStatsWithFilePath]
          ])(target);

          if(R.isEmpty(targetSet)) {
            // Wouldn't normally throw in a helper method, but it's the only way
            //   to exit a non-for-loop.
            throw InvalidFailureThresholdErr(target);
          }

          return targetSet;
        })
        |> R.uniq
        |> (
          strategy === FailureThresholdStategies.ANY
            ? anyStrategy
            : allStrategy
        );
    },
    failureThresholds
  );
};

// Just wrap uncheckedGetThresholdFailures and return Error object rather than
//   relying on exception bubbling.
export default unthrow(uncheckedGetThresholdFailures);
