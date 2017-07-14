import {join, pipe, reject} from 'ramda';

export const compact = list => reject(item => !item, list);

export const compactAndJoin =
  (separator, list) => pipe(compact, join(separator))(list);
