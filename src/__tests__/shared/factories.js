import R from 'ramda';

const mergeIgnoreUndefined = R.mergeWith((a, b) =>
  (b === undefined ? a : b)
);

const Factory = defaults => (data = {}) => mergeIgnoreUndefined(defaults, data);

export const PrResource = ({ref = '93hg8h4h22'} = {}) => ({
  base: {ref}
});

export const BuildResource = Factory({
  buildNum: '92',
  status: 'success'
});

export const ArtifactResource = Factory({
  path: '8932hfdlsajlf/project-name/bundle-sizes.json',
  url: 'http://circle-artifacts/my-url/84jhdfhads.json'
});
