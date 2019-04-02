import R from 'ramda';

export default (
  current,
  original,
  options = {onMismatchFound: R.identity}
) => R.toPairs(current) |> R.reduce((acc, [filepath, fileStats]) => {
  const originalStat = original[filepath];
  if(!originalStat) {
    options.onMismatchFound(filepath);

    return acc;
  }

  const difference = fileStats.size - originalStat.size;

  return {
    ...acc,
    [filepath]: {
      original: originalStat.size,
      current: fileStats.size,
      difference,
      // eslint-disable-next-line no-magic-numbers
      percentChange: difference / originalStat.size * 100
    }
  };
}, {});
