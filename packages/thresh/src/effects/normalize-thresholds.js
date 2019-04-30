import R from 'ramda';
import ReaderPromise from '@danny.andrews/reader-promise';

import resolveGlobs from './resolve-globs';

export default thresholds => ReaderPromise.parallel(
  thresholds.map(
    threshold => resolveGlobs(threshold.targets)
      .map(R.flatten)
      .map(R.uniq)
      .map(resolvedTargets => ({...threshold, resolvedTargets}))
  )
);
