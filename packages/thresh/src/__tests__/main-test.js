import test from 'ava';
import expect, {createSpy} from 'expect';
import {Maybe, Either} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import {NoAssetStatsArtifactFoundErr, NoRecentBuildsFoundErr}
  from '@danny.andrews/thresh-artifact-store-circleci';

import {firstCallFirstArgument} from '../test/helpers';
import main from '../main';

const subject = ({
  artifactsDirectory = 'd34g2d/artifacts',
  buildSha = 'f83jfhg2',
  buildUrl = 'http://circle.com/build/45',
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

test('posts pending commit status, writes asset stats to file, writes asset diffs to file, and posts success commit status', () => {
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
    buildUrl: 'http://circle.com/build/78',
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
      targetUrl: 'http://circle.com/build/78#artifacts',
      context: 'Asset Sizes',
      description: 'Calculating asset diffs and threshold failures (if any)...'
    });

    const [, successStatusArguments] = postCommitStatusSpy.calls[1].arguments;
    expect(successStatusArguments.method).toBe('POST');
    expect(successStatusArguments.body).toEqual({
      state: 'success',
      targetUrl: 'http://circle.com/build/78#artifacts',
      context: 'Asset Sizes',
      description: 'app.js: 400B (-100B, -20.00%)'
    });
  });
});

test('writes message to the console when no previous stat found for given filepath', () => {
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

test('posts error commit status and logs message when previous build has no stats', () => {
  const pr = '653';
  const baseBranch = 'master';
  const buildSha = 'lnbs3hdk';
  const buildNumber = '78';
  const logMessageSpy = createSpy();
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
        Either.Left(
          NoAssetStatsArtifactFoundErr(baseBranch, buildNumber)
        )
      )
    ]
  ]);

  return subject({
    buildSha,
    pullRequestId: Maybe.of(pr),
    buildUrl: `http://circle.com/build/${buildNumber}`,

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    logMessage: logMessageSpy
  }).then(() => {
    const expectedMessage = 'No asset stats artifact found for latest build of: `master`. Build number: `78`.';
    const [, errorStatusArguments] = postCommitStatusSpy.calls[1].arguments;
    expect(errorStatusArguments.method).toBe('POST');
    expect(errorStatusArguments.body).toEqual({
      state: 'error',
      targetUrl: 'http://circle.com/build/78#artifacts',
      context: 'Asset Sizes',
      description: expectedMessage
    });

    const actualMessage = firstCallFirstArgument(logMessageSpy);
    expect(actualMessage).toBe(expectedMessage);
  });
});

test('posts error commit status and logs message when no previous builds are found', () => {
  const pr = '3';
  const baseBranch = 'develop';
  const buildSha = 'ng832hfd';
  const buildNumber = '139';
  const logMessageSpy = createSpy();
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
        Either.Left(
          NoRecentBuildsFoundErr(baseBranch)
        )
      )
    ]
  ]);

  return subject({
    buildSha,
    pullRequestId: Maybe.of(pr),
    buildUrl: `http://circle.com/build/${buildNumber}`,

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    logMessage: logMessageSpy
  }).then(() => {
    const expectedMessage = 'No recent builds found for the base branch: `develop`.';
    const [, errorStatusArguments] = postCommitStatusSpy.calls[1].arguments;
    expect(errorStatusArguments.method).toBe('POST');
    expect(errorStatusArguments.body).toEqual({
      state: 'error',
      targetUrl: 'http://circle.com/build/139#artifacts',
      context: 'Asset Sizes',
      description: expectedMessage
    });

    const actualMessage = firstCallFirstArgument(logMessageSpy);
    expect(actualMessage).toBe(expectedMessage);
  });
});

test.only('writes asset stats and posts success commit status with asset stats (and a note explaining that diffs could not be calculated) when open pull request is not found', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'ljghay3h';
  const artifactsDirectory = '83jgs3/artifacts';
  const assetSize = 258;
  const assetName = 'main.js';
  const assetPath = 'main.38552hd3.js';
  const manifestFilepath = 'manifest.json';
  const outputDirectory = 'build';
  const postCommitStatusSpy = createSpy();
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
    artifactsDirectory,
    buildSha,
    buildUrl: 'http://circle.com/build/29',
    manifestFilepath,
    outputDirectory,
    pullRequestId: Maybe.None(),

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    getFileStats: () => Promise.resolve({size: assetSize}),
    readFile: () => Promise.resolve(JSON.stringify({[assetName]: assetPath})),
    writeFile: writeFileSpy
  }).then(() => {
    const [assetStatsFilepath, assetStats] = writeFileSpy.calls[0].arguments;
    expect(assetStatsFilepath)
      .toBe('83jgs3/artifacts/thresh/asset-stats.json');
    expect(JSON.parse(assetStats)).toEqual({
      'main.js': {
        size: 258,
        path: 'build/main.38552hd3.js'
      }
    });

    const [, successStatusArguments] = postCommitStatusSpy.calls[1].arguments;
    expect(successStatusArguments.method).toBe('POST');
    expect(successStatusArguments.body).toEqual({
      state: 'success',
      targetUrl: 'http://circle.com/build/29#artifacts',
      context: 'Asset Sizes',
      description: 'main.js: 258B (no open PR to calculate diffs from)'
    });
  });
});

test.todo('posts failure commit when failure thresholds are not met');

test.todo('saves running stats in database and appends projectName to commit status label when projectName is given (monorepo usecase)');
