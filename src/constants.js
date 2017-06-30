import path from 'path';

export const OUTPUT_FILEPATH = 'circleci-weigh-in';

export const BUNDLE_SIZES_FILEPATH = path.join(
  OUTPUT_FILEPATH,
  'bundle-sizes.json'
);

export const BUNDLE_SIZES_DIFF_FILEPATH = path.join(
  OUTPUT_FILEPATH,
  'bundle-sizes-diff.json'
);

export const UTF8 = 'utf8';
