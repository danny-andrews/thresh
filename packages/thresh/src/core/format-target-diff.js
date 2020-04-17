import filesize from 'filesize';
import {sprintf} from 'sprintf-js';

export const formatTarget = (filepath, size) => sprintf(
  '%s: %s',
  filepath,
  filesize(size, {spacer: ''})
);

export const formatDiff = (difference, percentChange) => {
  const {value, symbol} = filesize(difference, {output: 'object'});

  return difference === 0
    ? 'No Change'
    : sprintf(
      '%+i%s, %+.2f%%',
      value,
      symbol,
      percentChange
    );
};

export default ({targets, difference, current, percentChange}) => sprintf(
  '%s (%s)',
  formatTarget(targets, current),
  formatDiff(difference, percentChange)
);
