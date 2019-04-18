import R from 'ramda';
import {sprintf} from 'sprintf-js';
import filesize from 'filesize';
import {Either} from 'monet';

import {InvalidThresholdErr} from './errors';

const formatFilesize = size => filesize(size, {spacer: ''});

export default sizedThresholds => {
  const emptyResolvedTargets = sizedThresholds.find(
    ({resolvedTargets}) => R.isEmpty(resolvedTargets)
  );

  if(!R.isNil(emptyResolvedTargets)) {
    return InvalidThresholdErr(emptyResolvedTargets) |> Either.Left;
  }

  return R.chain(
    threshold => {
      const {resolvedTargets, maxSize, size} = threshold;

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
  ) |> Either.Right;
};
