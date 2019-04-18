import commandLineArgs from 'command-line-args';
import {Maybe} from 'monet';
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
    ({projectName, thresholds}) => main({
      projectName: Maybe.fromNull(projectName),
      pullRequestId,
      thresholds,
      buildSha,
      buildUrl,
      artifactsDirectory
    })
  );
