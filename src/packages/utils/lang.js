import R from 'ramda';
import {Either} from 'monet';
import {sprintf} from 'sprintf-js';

const executeIfFunction = f => R.type(f) === 'Function' ? f() : f;

export const switchCase = cases => defaultCase => key =>
  cases.has(key) ? cases.get(key) : defaultCase;

export const switchCaseF = cases => defaultCase => key =>
  executeIfFunction(switchCase(cases)(defaultCase)(key));

export const unthrow = fn => (...args) => {
  try {
    return Either.Right(fn(...args));
  } catch(e) {
    return Either.Left(e);
  }
};

export const CreateFactory = f => {
  const constructor = (...args) => ({...f(...args), constructor});

  return constructor;
};

export const CreateErrorFactory = messageTemplate => CreateFactory(
  (...args) => ({
    message: sprintf(messageTemplate, ...args)
  })
);
