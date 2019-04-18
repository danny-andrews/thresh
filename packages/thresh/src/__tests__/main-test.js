import test from 'ava';
import expect, {createSpy} from 'expect';
import {Maybe} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import {NoAssetStatsArtifactFoundErr, NoRecentBuildsFoundErr}
  from '@danny.andrews/thresh-artifact-store-circleci';
import R from 'ramda';

import {firstCallFirstArgument, firstCallArguments} from '../test/helpers';
import main from '../main';

const secondCallArguments = R.lensPath(['calls', 1, 'arguments']);

const subject = ({
  artifactsDirectory = 'd34g2d/artifacts',
  buildSha = 'f83jfhg2',
  buildUrl = 'http://circle.com/build/45',
  thresholds = [],
  projectName = Maybe.None(),
  pullRequestId = Maybe.of('33'),

  // Dependencies
  artifactStore = {
    getAssetStats: () => Promise.resolve({})
  },
  db = () => Promise.resolve(),
  getFileStats = () => Promise.resolve({size: 200}),
  logMessage = console.log,
  makeGitHubRequest = () => ReaderPromise.of({base: {}}),
  mkdir = () => Promise.resolve(),
  resolve = (...args) => [...args].join('/'),
  resolveGlob = () => Promise.resolve(),
  writeFile = () => Promise.resolve()
} = {}) => main({
  artifactsDirectory,
  buildSha,
  buildUrl,
  thresholds,
  projectName,
  pullRequestId
}).run({
  artifactStore,
  db,
  getFileStats,
  logMessage,
  makeGitHubRequest,
  mkdir,
  resolve,
  resolveGlob,
  writeFile
}).catch(console.error);

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
  const originalSize = 500;
  const currentSize = 400;
  const artifactsDirectory = 'djeh9h/artifacts';
  const assetPath = 'dist/app.3u3232.js';
  const resolveGlob = () => Promise.resolve([assetPath]);
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
      () => Promise.resolve([
        {filepath: 'dist/app.h9832h.js', size: originalSize}
      ])
    ]
  ]);

  return subject({
    artifactsDirectory,
    buildSha,
    buildUrl: 'http://circle.com/build/78',
    pullRequestId: Maybe.of(pr),
    thresholds: [{
      maxSize: Infinity,
      targets: 'dist/app.*.js'
    }],

    // Dependencies
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    getFileStats: () => Promise.resolve({size: currentSize}),
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    resolveGlob,
    writeFile: writeFileSpy
  }).then(() => {
    const [assetStatsFilepath, assetStats] = R.view(
      firstCallArguments,
      writeFileSpy
    );
    expect(assetStatsFilepath)
      .toBe('djeh9h/artifacts/thresh/asset-stats.json');
    expect(JSON.parse(assetStats)).toEqual([{
      filepath: 'dist/app.3u3232.js',
      size: 400
    }]);

    const [assetDiffsFilepath, assetDiffs] = R.view(
      secondCallArguments,
      writeFileSpy
    );
    expect(assetDiffsFilepath)
      .toBe('djeh9h/artifacts/thresh/asset-diffs.json');
    expect(JSON.parse(assetDiffs)).toEqual({
      diffs: [{
        targets: ['dist/app.*.js'],
        original: 500,
        current: 400,
        difference: -100,
        percentChange: -20
      }],
      failures: []
    });
    const [, pendingStatusArguments] = R.view(
      firstCallArguments,
      postCommitStatusSpy
    );
    expect(pendingStatusArguments.method).toBe('POST');
    expect(pendingStatusArguments.body).toEqual({
      state: 'pending',
      targetUrl: 'http://circle.com/build/78#artifacts',
      context: 'Asset Sizes',
      description: 'Calculating asset diffs and threshold failures (if any)...'
    });

    const [, successStatusArguments] = R.view(
      secondCallArguments,
      postCommitStatusSpy
    );
    expect(successStatusArguments.method).toBe('POST');
    expect(successStatusArguments.body).toEqual({
      state: 'success',
      targetUrl: 'http://circle.com/build/78#artifacts',
      context: 'Asset Sizes',
      description: 'dist/app.*.js: 400B (-100B, -20.00%)'
    });
  });
});

test('writes message to the console when no previous stat found for given filepath', () => {
  const baseBranch = 'develop';
  const assetPath = 'dist/vendor.fdjsayr.js';
  const mismatchedAssetFilepath = 'dist/app.hfdsy4.js';
  const logMessageSpy = createSpy();
  const pr = '235';
  const resolveGlob = () => Promise.resolve([assetPath]);
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
      () => Promise.resolve([
        {
          filepath: mismatchedAssetFilepath,
          size: 300
        }
      ])
    ]
  ]);

  return subject({
    pullRequestId: Maybe.of(pr),
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    logMessage: logMessageSpy,
    thresholds: [{
      maxSize: Infinity,
      targets: 'dist/vendor.*.js'
    }],
    resolveGlob
  }).then(() => {
    const actual = R.view(firstCallFirstArgument, logMessageSpy);
    expect(actual).toBe('No previous stats found for dist/vendor.fdjsayr.js. Did you rename that file recently?');
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
      () => Promise.reject(
        NoAssetStatsArtifactFoundErr(baseBranch, buildNumber)
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
    const [, errorStatusArguments] = R.view(
      secondCallArguments,
      postCommitStatusSpy
    );
    expect(errorStatusArguments.method).toBe('POST');
    expect(errorStatusArguments.body).toEqual({
      state: 'error',
      targetUrl: 'http://circle.com/build/78#artifacts',
      context: 'Asset Sizes',
      description: expectedMessage
    });

    const actualMessage = R.view(firstCallFirstArgument, logMessageSpy);
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
      () => Promise.reject(
        NoRecentBuildsFoundErr(baseBranch)
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
    const expectedMessage = 'No recent successful builds found for the base branch: `develop`.';
    const [, errorStatusArguments] = R.view(
      secondCallArguments,
      postCommitStatusSpy
    );
    expect(errorStatusArguments.method).toBe('POST');
    expect(errorStatusArguments.body).toEqual({
      state: 'error',
      targetUrl: 'http://circle.com/build/139#artifacts',
      context: 'Asset Sizes',
      description: expectedMessage
    });

    const actualMessage = R.view(firstCallFirstArgument, logMessageSpy);
    expect(actualMessage).toBe(expectedMessage);
  });
});

test('writes asset stats and posts success commit status with asset stats (and a note explaining that diffs could not be calculated) when open pull request is not found', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'ljghay3h';
  const artifactsDirectory = '83jgs3/artifacts';
  const assetSize = 258;
  const assetPath = 'build/main.38552hd3.js';
  const postCommitStatusSpy = createSpy();
  const logMessageSpy = createSpy();
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
    pullRequestId: Maybe.None(),

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    getFileStats: () => Promise.resolve({size: assetSize}),
    resolveGlob: () => Promise.resolve([assetPath]),
    thresholds: [{
      maxSize: Infinity,
      targets: 'dist/main.*.js'
    }],
    logMessage: logMessageSpy,
    writeFile: writeFileSpy
  }).then(() => {
    const [assetStatsFilepath, assetStats] = R.view(
      firstCallArguments,
      writeFileSpy
    );
    expect(assetStatsFilepath)
      .toBe('83jgs3/artifacts/thresh/asset-stats.json');
    expect(JSON.parse(assetStats)).toEqual([
      {
        size: 258,
        filepath: 'build/main.38552hd3.js'
      }
    ]);

    const [, successStatusArguments] = R.view(
      secondCallArguments,
      postCommitStatusSpy
    );
    expect(successStatusArguments.method).toBe('POST');
    expect(successStatusArguments.body).toEqual({
      state: 'success',
      targetUrl: 'http://circle.com/build/29#artifacts',
      context: 'Asset Sizes',
      description: 'build/main.38552hd3.js: 258B (no open PR; cannot calculate diffs)'
    });

    expect(R.view(firstCallFirstArgument, logMessageSpy)).toBe('No open pull request found. Skipping asset diff step.');
  });
});

test('posts failure commit status when thresholds are not met', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'fjdk29uw';
  const pr = '200';
  const baseBranch = 'master';
  const assetSize = 400;
  const assetPath = 'build.3u3232.js';
  const buildNumber = '21';
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
      () => Promise.resolve([
        {
          filepath: assetPath,
          size: 200
        }
      ])
    ]
  ]);

  return subject({
    buildSha,
    buildUrl: `http://circle.com/build/${buildNumber}`,
    pullRequestId: Maybe.of(pr),
    thresholds: [{
      maxSize: 300,
      targets: '*.js'
    }],

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    getFileStats: () => Promise.resolve({size: assetSize}),
    writeFile: writeFileSpy,
    resolveGlob: () => Promise.resolve([assetPath])
  }).then(() => {
    const [, failureStatusArguments] = R.view(
      secondCallArguments,
      postCommitStatusSpy
    );
    expect(failureStatusArguments.method).toBe('POST');
    expect(failureStatusArguments.body).toEqual({
      state: 'failure',
      targetUrl: 'http://circle.com/build/21#artifacts',
      context: 'Asset Sizes',
      description: 'The total size of ["build.3u3232.js"] (400B) must be less than or equal to 300B!'
    });
  });
});

test('posts success commit status when failure thresholds are met', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'algh83he';
  const pr = '200';
  const baseBranch = 'master';
  const assetSize = 267;
  const assetPath = 'app.dj39hf.js';
  const buildNumber = '29';
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
      () => Promise.resolve([
        {
          filepath: assetPath,
          size: 400
        }
      ])
    ]
  ]);

  return subject({
    buildSha,
    buildUrl: `http://circle.com/build/${buildNumber}`,
    pullRequestId: Maybe.of(pr),
    thresholds: [{
      maxSize: 550,
      targets: '*.js'
    }],

    // Dependencies
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    artifactStore: {
      getAssetStats: fakeGetAssetStats(getAssetStatsRequestHandlers)
    },
    getFileStats: () => Promise.resolve({size: assetSize}),
    resolveGlob: () => Promise.resolve([assetPath]),
    writeFile: writeFileSpy
  }).then(() => {
    const [, successStatusArguments] = R.view(
      secondCallArguments,
      postCommitStatusSpy
    );
    expect(successStatusArguments.method).toBe('POST');
    expect(successStatusArguments.body).toEqual({
      state: 'success',
      targetUrl: 'http://circle.com/build/29#artifacts',
      context: 'Asset Sizes',
      description: '*.js: 267B (-133B, -33.25%)'
    });
  });
});
