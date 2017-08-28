import R from 'ramda';
import {truncate} from '../shared';
import formatBundleDiff from './format-bundle-diff';

const MAX_DESCRIPTION_LENGTH = 140;

const StatusStates = {
  FAILURE: 'failure',
  SUCCESS: 'success'
};

export default ({bundleDiffs, thresholdFailures, targetUrl = '', label}) => ({
  state: R.isEmpty(thresholdFailures)
    ? StatusStates.SUCCESS
    : StatusStates.FAILURE,
  targetUrl,
  description: R.pipe(
    R.join(' \n'),
    truncate({maxSize: MAX_DESCRIPTION_LENGTH})
  )(
    R.isEmpty(thresholdFailures)
      ? R.toPairs(bundleDiffs)
        .map(([filename, bundleDiff]) =>
          formatBundleDiff({filename, ...bundleDiff})
        )
      : thresholdFailures.map(({message}) => message)
  ),
  context: label
});
