import R from 'ramda';

export const PromiseError = a => Promise.reject(Error(a));

export const calls = R.lensProp('calls');

export const firstCallArguments = R.compose(
  calls,
  R.lensPath([0, 'arguments'])
);

export const firstCallFirstArgument = R.compose(
  firstCallArguments,
  R.lensIndex(0)
);
