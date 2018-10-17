import test from 'ava';
import expect, {createSpy} from 'expect';
import {Maybe, Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';

import {firstCallFirstArgument} from '../test/helpers';
import main from '../main';

const subject = ({
  artifactsDirectory = 'd34g2d/artifacts',
  buildSha = 'f83jfhg2',
  buildUrl = 'http://circle.com/build',
  failureThresholds = [],
  manifestFilepath = 'manifest.json',
  outputDirectory = 'dist',
  projectName = Maybe.None(),
  pullRequestId = Maybe.of('33'),

  // Dependencies
  writeFile = () => Promise.resolve(),
  readFile = () => Promise.resolve('{}'),
  resolve = (...args) => [...args].join('/'),
  db = () => Promise.resolve(),
  mkdir = () => Promise.resolve(),
  getFileStats = () => Promise.resolve({}),
  logMessage = () => {},
  logError = () => {},
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
  resolve,
  writeFile
});

const warnOnMissingHandlers = false;

const fakeGitHubRequest = handlers => (path, ...rest) => {
  if(handlers.has(path)) {
    return handlers.get(path)(path, ...rest);
  }

  if(warnOnMissingHandlers) {
    console.log(`No handler found for GitHub request to: ${path}`);
  }

  return ReaderPromise.of();
};

const fakeGetAssetStats = handlers => (branch, ...rest) => {
  if(handlers.has(branch)) {
    return handlers.get(branch)(branch, ...rest);
  }

  if(warnOnMissingHandlers) {
    console.log(
      `No handler found for call to 'getAssetStats' for branch: ${branch}`
    );
  }

  return ReaderPromise.of();
};

test('happy path (posts pending commit status, writes asset stats to file, writes asset diffs to file, and posts success commit status)', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'dkg93hdk';
  const pr = '99';
  const baseBranch = 'master';
  const artifactsDirectory = 'djeh9h/artifacts';
  const originalSize = 500;
  const currentSize = 400;
  const assetName = 'app.js';
  const assetPath = 'app.3u3232.js';
  const manifestFilepath = 'manifest.json';
  const outputDirectory = 'dist';
  const postCommitStatusSpy = createSpy();
  const gitHubRequestHandlers = new Map([
    [
      `statuses/${buildSha}`,
      (...args) => {
        postCommitStatusSpy(...args);

        return ReaderPromise.of();
      }
    ],
    [
      `pulls/${pr}`,
      () => ReaderPromise.of({
        base: {
          ref: baseBranch
        }
      })
    ]
  ]);
  const getAssetStatsRequestHandlers = new Map([
    [
      baseBranch,
      () => Promise.resolve(
        Either.Right({
          [assetName]: {
            size: originalSize
          }
        })
      )
    ]
  ]);

  return subject({
    artifactsDirectory,
    buildSha,
    manifestFilepath,
    outputDirectory,
    pullRequestId: Maybe.of(pr),

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    getFileStats: () => Promise.resolve({size: currentSize}),
    readFile: path => path === manifestFilepath
      ? Promise.resolve(JSON.stringify({[assetName]: assetPath}))
      : Promise.reject(Error()),
    writeFile: writeFileSpy
  }).then(() => {
    const [assetStatsFilepath, assetStats] = writeFileSpy.calls[0].arguments;
    expect(assetStatsFilepath)
      .toBe('djeh9h/artifacts/thresh/asset-stats.json');
    expect(JSON.parse(assetStats)).toEqual({
      'app.js': {
        size: 400,
        path: 'dist/app.3u3232.js'
      }
    });

    const [assetDiffsFilepath, assetDiffs] = writeFileSpy.calls[1].arguments;
    expect(assetDiffsFilepath)
      .toBe('djeh9h/artifacts/thresh/asset-diffs.json');
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
    const [, pendingStatusArguments] = postCommitStatusSpy.calls[0].arguments;
    expect(pendingStatusArguments.method).toBe('POST');
    expect(pendingStatusArguments.body).toEqual({
      state: 'pending',
      targetUrl: 'http://circle.com/build#artifacts',
      context: 'Asset Sizes',
      description: 'Calculating asset diffs and threshold failures (if any)...'
    });

    const [, successStatusArguments] = postCommitStatusSpy.calls[1].arguments;
    expect(successStatusArguments.method).toBe('POST');
    expect(successStatusArguments.body).toEqual({
      state: 'success',
      targetUrl: 'http://circle.com/build#artifacts',
      context: 'Asset Sizes',
      description: 'app.js: 400B (-100B, -20.00%)'
    });
  });
});

test('returns error and posts error status when non-schema-matching failure threshold is provided', () => {
  const postCommitStatusSpy = createSpy();
  const buildSha = 'hkgh037h';
  const gitHubRequestHandlers = new Map([
    [
      `statuses/${buildSha}`,
      (...args) => {
        postCommitStatusSpy(...args);

        return ReaderPromise.of();
      }
    ]
  ]);

  return subject({
    failureThresholds: [{maxSize: 'not a number'}],
    buildSha,

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers)
  }).catch(error => {
    expect(error.message).toBe("'failure-thresholds' option is invalid. Problem(s): data[0].maxSize should be number");
    const [, failureStatusArguments] = postCommitStatusSpy.calls[0].arguments;
    expect(failureStatusArguments.method).toBe('POST');
    expect(failureStatusArguments.body).toEqual({
      state: 'error',
      targetUrl: 'http://circle.com/build#artifacts',
      context: 'Asset Sizes',
      description: "'failure-thresholds' option is invalid. Problem(s): data[0].maxSize should be number"
    });
  });
});

test.only('writes message to the console when no previous stat found for given filepath', () => {
  const baseBranch = 'develop';
  const assetName = 'vendor.js';
  const assetPath = 'vendor.fdjsayr.js';
  const mismatchedAssetName = 'app.js';
  const logMessageSpy = createSpy();
  const pr = '235';
  const gitHubRequestHandlers = new Map([
    [
      `pulls/${pr}`,
      () => ReaderPromise.of({
        base: {
          ref: baseBranch
        }
      })
    ]
  ]);
  const getAssetStatsRequestHandlers = new Map([
    [
      baseBranch,
      () => Promise.resolve(
        Either.Right({
          [mismatchedAssetName]: {
            size: 300
          }
        })
      )
    ]
  ]);

  return subject({
    pullRequestId: Maybe.of(pr),
    readFile: () => Promise.resolve(JSON.stringify({[assetName]: assetPath})),
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    logMessage: logMessageSpy
  }).then(() => {
    const actual = firstCallFirstArgument(logMessageSpy);
    expect(actual).toBe('No previous stats found for vendor.js. Did you rename that file recently?');
  });
});

test.todo('writes asset stats and posts success PR status with asset stats (and a note explaining that diffs could not be calculated) when open pull request is not found');

test.todo('saves running stats in database and appends projectName to commit status label when projectName is given (monorepo usecase)');

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
