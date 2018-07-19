import R from 'ramda';
import {Either} from 'monet';
import {JSON_OUTPUT_SPACING} from '../core/constants';

const executeIfFunction = f => R.type(f) === 'Function' ? f() : f;

export const switchCase = cases => defaultCase => key =>
  cases.has(key) ? cases.get(key) : defaultCase;

export const switchCaseF = cases => defaultCase => key =>
  executeIfFunction(switchCase(cases)(defaultCase)(key));

export const compact = R.reject(item => !item);

export const compactAndJoin = (separator, list) =>
  compact(list) |> R.join(separator);

export const unthrow = fn => (...args) => {
  try {
    return Either.Right(fn(...args));
  } catch(e) {
    return Either.Left(e);
  }
};

export const truncate = R.curry(({maxSize, contSuffix = '...'}, string) => (
  string.length > maxSize
    ? [string.substring(0, maxSize - contSuffix.length), contSuffix].join('')
    : string
));

export const serializeForFile = val =>
  JSON.stringify(val, null, JSON_OUTPUT_SPACING);

export const CreateFactory = f => {
  const constructor = (...args) => ({...f(...args), constructor});

  return constructor;
};

export const CreateErrorFactory = () =>
  CreateFactory(context => ({context}));
