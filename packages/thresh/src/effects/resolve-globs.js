import ReaderPromise from '@danny.andrews/reader-promise';
import R from 'ramda';

import {resolveGlob} from './base';

export default globs => ReaderPromise.parallel(R.map(resolveGlob, globs));
