import ReaderPromise from '@danny.andrews/reader-promise';

import main from './main';
import {getConfig, getCiEnvVars} from './effects';

export default () => ReaderPromise.parallel([
  getConfig(),
  getCiEnvVars()
]).chain(
  ([
    {thresholds},
    {buildSha, buildUrl, artifactsDirectory, pullRequestId}
  ]) => main({
    pullRequestId,
    thresholds,
    buildSha,
    buildUrl,
    artifactsDirectory
  })
);
