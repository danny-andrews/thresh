import filesize from 'filesize';
import {sprintf} from 'sprintf-js';

export default ({filename, difference, current, percentChange}) => {
  const {value, symbol} = filesize(difference, {output: 'object'});

  const statsDiff = difference === 0
    ? 'No Change'
    : sprintf(
      '%+i%s, %+.2f%%',
      value,
      symbol,
      percentChange
    );

  return sprintf(
    '%s: %s (%s)',
    filename,
    filesize(current, {spacer: ''}),
    statsDiff
  );
};
