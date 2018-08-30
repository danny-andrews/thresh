/* eslint-disable no-console */
import path from 'path';

import {mkdir, writeFile, readFile, getFileStats, Database, request}
  from './shared';
import thresh from './thresh';
import {
  postFinalPrStatus,
  postPendingPrStatus,
  postErrorPrStatus,
  makeArtifactDirectory,
  readManifest,
  saveStats,
  writeAssetStats,
  writeAssetDiffs,
  getAssetFileStats
} from './effects';

export default options =>
  thresh({
    postFinalPrStatus,
    postPendingPrStatus,
    postErrorPrStatus,
    makeArtifactDirectory,
    readManifest,
    getAssetFileStats,
    saveStats,
    writeAssetStats,
    writeAssetDiffs,
    artifactStore: options.artifactStore
  })(options)
    .run({
      writeFile,
      readFile,
      resolve: path.resolve,
      request,
      db: Database('my.db'),
      mkdir,
      getFileStats,
      logMessage: console.log,
      logError: console.error
    });
