import {Either} from 'monet';
import {sprintf} from 'sprintf-js';

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
