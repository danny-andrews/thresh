import R from 'ramda';

export const PromiseError = a => Promise.reject(Error(a));

export const firstCallFirstArgument = R.path(['calls', 0, 'arguments', 0]);

export const firstCallArguments = R.path(['calls', 0, 'arguments']);
