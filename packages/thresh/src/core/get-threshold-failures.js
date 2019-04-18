import R from 'ramda';
import {sprintf} from 'sprintf-js';
import filesize from 'filesize';
import {unthrow} from '@danny.andrews/fp-utils';

import {InvalidFailureThresholdErr} from './errors';

const formatFilesize = size => filesize(size, {spacer: ''});

const uncheckedGetThresholdFailures = sizedThresholds =>
  R.chain(
    threshold => {
      const {resolvedTargets, maxSize, size} = threshold;
      if(R.isEmpty(resolvedTargets)) {
        // Wouldn't normally throw in a helper method, but it's the only way
        // to exit a non-for-loop.
        throw InvalidFailureThresholdErr(resolvedTargets);
      }

      if(size <= maxSize) return [];

      const offendingAssetPaths = resolvedTargets
        .map(filepath => `"${filepath}"`)
        .join(', ');

      const message = sprintf(
        'The total size of [%s] (%s) must be less than or equal to %s!',
        offendingAssetPaths,
        formatFilesize(size),
        formatFilesize(maxSize),
      );

      return {
        message,
        threshold,
        offendingAssets: resolvedTargets
      };
    },
    sizedThresholds
  );

// Just wrap uncheckedGetThresholdFailures and return Error object rather than
// relying on exception bubbling.
export default unthrow(uncheckedGetThresholdFailures);
