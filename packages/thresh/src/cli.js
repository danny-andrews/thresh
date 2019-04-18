import commandLineArgs from 'command-line-args';
import CircleciAdapter from '@danny.andrews/thresh-ci-adapter-circleci';
import {camelizeKeys} from 'humps';

import main from './main';
import {readConfig} from './effects';

const {buildSha, buildUrl, artifactsDirectory, pullRequestId} =
  CircleciAdapter().getEnvVars();

const cliOptions = commandLineArgs([
  {name: 'config-path', defaultValue: './.threshrc.toml'}
]);

export default () => readConfig(cliOptions['config-path'])
  .map(camelizeKeys)
  .chain(
    ({thresholds}) => main({
      pullRequestId,
      thresholds,
      buildSha,
      buildUrl,
      artifactsDirectory
    })
  );
