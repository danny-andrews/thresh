import R from 'ramda';
import {sprintf} from 'sprintf-js';
import {CreateFactory} from 'utils';

import {JSON_OUTPUT_SPACING} from '../core/constants';

export const compact = R.reject(item => !item);

export const compactAndJoin = (separator, list) =>
  compact(list) |> R.join(separator);

export const truncate = R.curry(({maxSize, contSuffix = '...'}, string) => (
  string.length > maxSize
    ? [string.substring(0, maxSize - contSuffix.length), contSuffix].join('')
    : string
));

export const serializeForFile = val =>
  JSON.stringify(val, null, JSON_OUTPUT_SPACING);

export const CreateRequestErrorFactory = () =>
  CreateFactory(context => ({context}));

export const CreateErrorFactory = messageTemplate => CreateFactory(
  (...args) => ({
    message: sprintf(messageTemplate, ...args)
  })
);
