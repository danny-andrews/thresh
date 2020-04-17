import R from 'ramda';
import {sprintf} from 'sprintf-js';
import filesize from 'filesize';
import {Either} from 'monet';

import {InvalidThresholdErr} from './errors';

const formatFilesize = size => filesize(size, {spacer: ''});

export default sizedThresholds => {
  const emptyThreshold = sizedThresholds.find(
    ({resolvedTargets}) => R.isEmpty(resolvedTargets)
  );

  if(!R.isNil(emptyThreshold)) {
    return InvalidThresholdErr(emptyThreshold.targets) |> Either.Left;
  }

  return R.chain(
    threshold => {
      const {resolvedTargets, maxSize, size} = threshold;

      if(size <= maxSize) return [];

      const offendingTargetPaths = resolvedTargets
        .map(filepath => `"${filepath}"`)
        .join(', ');

      const message = sprintf(
        'The total size of [%s] (%s) must be less than or equal to %s!',
        offendingTargetPaths,
        formatFilesize(size),
        formatFilesize(maxSize)
      );

      return {
        message,
        threshold,
        offendingTargets: resolvedTargets
      };
    },
    sizedThresholds
  ) |> Either.Right;
};
