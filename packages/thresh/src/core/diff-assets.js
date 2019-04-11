import R from 'ramda';
import micromatch from 'micromatch';

import {sumReduce, listToMap} from '../shared';

export default (
  currentSizedTargetSets,
  originalAssetStats,
  options = {onMismatchFound: R.identity}
) => {
  const originalFilepaths = originalAssetStats.map(R.prop('filepath'));

  return R.chain(
    ({targets, resolvedTargets, size}) => {
      const originalResolvedTargets = micromatch(
        originalFilepaths,
        targets
      );
      if(originalResolvedTargets.length !== resolvedTargets.length) {
        options.onMismatchFound(resolvedTargets);

        return [];
      }
      const originalAssetStatsMap = listToMap(
        R.prop('filepath'),
        originalAssetStats
      );
      const originalSize = sumReduce(
        filepath => originalAssetStatsMap[filepath].size,
        originalResolvedTargets
      );

      const difference = size - originalSize;

      return {
        targets,
        original: originalSize,
        current: size,
        difference,
        percentChange: difference / originalSize * 100
      };
    },
    currentSizedTargetSets
  );
};
