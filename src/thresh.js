import path from 'path';

import cli from './cli';
import {readFile, mkdir, writeFile, getFileStats, Database, request}
  from './shared';

cli().run({
  writeFile,
  readFile,
  resolve: path.resolve,
  request,
  db: Database('my.db'),
  mkdir,
  getFileStats,
  logMessage: console.log, // eslint-disable-line no-console
  logError: console.error // eslint-disable-line no-console
}).catch(err => {
  console.error(err); // eslint-disable-line no-console
  process.exit(1); // eslint-disable-line no-process-exit
});
