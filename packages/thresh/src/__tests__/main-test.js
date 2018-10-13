import test from 'ava';
import expect, {createSpy} from 'expect';
import {Maybe, Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import {switchCase} from '@danny.andrews/fp-utils';

import {PromiseError} from '../test/helpers';
import main from '../main';

const fakeRequest = switchCase(
  new Map([
    [
      /repos\/.*\/pulls/,
      Promise.resolve({
        base: {ref: 'd39h'}
      })
    ],
    [
      /project\/github\/.*\/tree/,
      Promise.resolve([{
        buildNum: '92',
        status: 'success'
      }])
    ],
    [
      /project\/github\/.*\/tree/,
      Promise.resolve([{
        path: '8932hfdlsajlf/project-name/asset-stats.json',
        url: 'http://circle-artifacts/my-url/84jhdfhads.json'
      }])
    ],
    [
      new RegExp('my-url/84jhdfhads'),
      Promise.resolve('{}')
    ],
    [
      /repos\/.*\/statuses/,
      Promise.resolve({})
    ]
  ])
)(PromiseError('no handler found for this response'));

const subject = ({
  artifactsDirectory = 'lfjk3208hohefi4/artifacts',
  buildSha = '8fdhihfj',
  buildUrl = 'http://circle.com/my-build',
  failureThresholds = [],
  manifestFilepath = 'dist/manifest.json',
  outputDirectory = '',
  projectName = Maybe.None(),
  pullRequestId = Maybe.of('f820yf3h'),
  writeFile = () => Promise.resolve(),
  readFile = () => Promise.resolve('{}'),
  resolve = () => Promise.resolve(),
  db = () => Promise.resolve(),
  mkdir = () => Promise.resolve(),
  getFileStats = () => Promise.resolve({}),
  logMessage = () => {},
  logError = () => {},
  request = fakeRequest,
  makeGitHubRequest = () => ReaderPromise.of({base: {}}),
  artifactStore = {
    getAssetStats: () => Promise.resolve(
      Either.Right({})
    )
  }
} = {}) => main({
  artifactsDirectory,
  buildSha,
  buildUrl,
  failureThresholds,
  manifestFilepath,
  outputDirectory,
  projectName,
  pullRequestId
}).run({
  artifactStore,
  db,
  getFileStats,
  logMessage,
  logError,
  makeGitHubRequest,
  mkdir,
  readFile,
  request,
  resolve,
  writeFile
});

test('happy path (writes asset stats to file, writes asset diffs to file, and posts success commit status)', () => {
  const writeFileSpy = createSpy();

  return subject({
    artifactsDirectory: 'lfjk3208hohefi4/artifacts',
    failureThresholds: [],
    manifestFilepath: 'dist/manifest.json',
    outputDirectory: 'dist',
    projectName: Maybe.None(),
    pullRequestId: Maybe.of('f820yf3h'),

    // Dependencies
    artifactStore: {
      getAssetStats: () => Promise.resolve(
        Either.Right({
          'app.js': {
            size: 500
          }
        })
      )
    },
    getFileStats: () => Promise.resolve({size: 400}),
    readFile: path => path === 'dist/manifest.json'
      ? Promise.resolve(JSON.stringify({'app.js': 'app.3u3232.js'}))
      : Promise.reject(Error()),
    resolve: (...args) => [...args].join('/'),
    writeFile: writeFileSpy
  }).then(() => {
    const [assetStatsFilepath, assetStats] = writeFileSpy.calls[0].arguments;
    expect(assetStatsFilepath).toBe('lfjk3208hohefi4/artifacts/thresh/asset-stats.json');
    expect(JSON.parse(assetStats)).toEqual({
      'app.js': {
        size: 400,
        path: 'dist/app.3u3232.js'
      }
    });

    const [assetDiffsFilepath, assetDiffs] = writeFileSpy.calls[1].arguments;
    expect(assetDiffsFilepath).toBe('lfjk3208hohefi4/artifacts/thresh/asset-diffs.json');
    expect(JSON.parse(assetDiffs)).toEqual({
      diffs: {
        'app.js': {
          original: 500,
          current: 400,
          difference: -100,
          percentChange: -20
        }
      },
      failures: []
    });
  });
});

test.todo('returns error when non-schema-matching failure threshold is provided');

test.todo('writes asset stats and posts success PR status with asset stats (and a note explaining that diffs could not be calculated)');

test.todo('saves running stats in database and appends projectName to commit status label when projectName is given (monorepo usecase)');

test.todo('writes message to the console when no previous stat found for given filepath');

test.todo('handles case where previous build has no stats for current project');

test.todo('posts error PR status when error is encountered');

test.todo('posts failure PR when failure thresholds are not met');

test.todo('posts success PR when failure thresholds are met');

// Error-handling checks
test.todo('surfaces errors reading manifest');

test.todo('surfaces errors reading file stats');

test.todo('surfaces errors getting previous file stats');

test.todo('surfaces errors posting pending status');

test.todo('surfaces errors making artifact directory');

test.todo('surfaces errors writing asset stats');

test.todo('surfaces errors writing asset diffs');
