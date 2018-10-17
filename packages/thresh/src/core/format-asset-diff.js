import filesize from 'filesize';
import {sprintf} from 'sprintf-js';

export const formatAsset = (filename, size) => sprintf(
  '%s: %s',
  filename,
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

export default ({filename, difference, current, percentChange}) => sprintf(
  '%s (%s)',
  formatAsset(filename, current),
  formatDiff(difference, percentChange)
);
