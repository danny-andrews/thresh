import R from 'ramda';
import micromatch from 'micromatch';

import {sumReduce, listToMap} from '../shared';

export default (currentSizedTargetSets, originalTargetStats) => {
  const originalFilepaths = originalTargetStats.map(R.prop('filepath'));
  const originalTargetStatsMap = listToMap(
    R.prop('filepath'),
    originalTargetStats
  );

  return currentSizedTargetSets.reduce(
    ([diffs, mismatchedTargets], {targets, resolvedTargets, size}) => {
      const originalResolvedTargets = micromatch(
        originalFilepaths,
        targets
      );

      if(originalResolvedTargets.length !== resolvedTargets.length) {
        return [diffs, R.append(resolvedTargets, mismatchedTargets)];
      }

      const originalSize = sumReduce(
        filepath => originalTargetStatsMap[filepath].size,
        originalResolvedTargets
      );
      const difference = size - originalSize;

      return [
        R.append(
          {
            targets,
            original: originalSize,
            current: size,
            difference,
            percentChange: difference / originalSize * 100
          },
          diffs
        ),
        mismatchedTargets
      ];
    },
    [[], []]
  );
};
