import R from 'ramda';
import micromatch from 'micromatch';

import {sumReduce, listToMap} from '../shared';

export default (currentSizedTargetSets, previousTargetStats) => {
  const previousFilepaths = previousTargetStats.map(R.prop('filepath'));
  const previousTargetStatsMap = listToMap(
    R.prop('filepath'),
    previousTargetStats
  );

  return currentSizedTargetSets.reduce(
    ([diffs, mismatchedTargets], {targets, resolvedTargets, size}) => {
      const previousResolvedTargets = micromatch(
        previousFilepaths,
        targets
      );

      if(previousResolvedTargets.length !== resolvedTargets.length) {
        return [
          diffs,
          R.append(
            {
              currentTargets: resolvedTargets,
              previousTargets: previousResolvedTargets,
              targets
            },
            mismatchedTargets
          )
        ];
      }

      const previousSize = sumReduce(
        filepath => previousTargetStatsMap[filepath].size,
        previousResolvedTargets
      );
      const difference = size - previousSize;

      return [
        R.append(
          {
            targets,
            previous: previousSize,
            current: size,
            difference,
            percentChange: difference / previousSize * 100
          },
          diffs
        ),
        mismatchedTargets
      ];
    },
    [[], []]
  );
};
