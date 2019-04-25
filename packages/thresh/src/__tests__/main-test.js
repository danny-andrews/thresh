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

const fakeGitHubRequest = handlers => (path, ...rest) => {
  if(!handlers.has(path)) {
    throw new Error(`No handler found for GitHub request to: ${path}`);
  }

  return handlers.get(path)(path, ...rest);
};

const subject = ({
  artifactsDirectory = 'd34g2d/artifacts',
  baseBranch = 'release',
  buildSha = 'f83jfhg2',
  buildUrl = 'http://circle.com/build/45',
  pullRequestId = Maybe.of('33'),
  thresholds = [],

  // Dependencies
  artifactStore = {
    getAssetStats: () => Promise.resolve({})
  },
  getFileStats = () => Promise.resolve({size: 200}),
  logMessage = console.log,
  makeGitHubRequest,
  mkdir = () => Promise.resolve(),
  resolve = (...args) => [...args].join('/'),
  resolveGlob = () => Promise.resolve(),
  writeFile = () => Promise.resolve()
} = {}) => main({
  artifactsDirectory,
  buildSha,
  buildUrl,
  pullRequestId,
  thresholds
}).run({
  artifactStore,
  getFileStats,
  logMessage,
  makeGitHubRequest: makeGitHubRequest || fakeGitHubRequest(
    new Map([
      [
        `statuses/${buildSha}`,
        ReaderPromise.of
      ],
      [
        `pulls/${pullRequestId.some()}`,
        () => ReaderPromise.of({
          base: {
            ref: baseBranch
          }
        })
      ]
    ])
  ),
  mkdir,
  resolve,
  resolveGlob,
  writeFile
}).catch(console.error);

test('posts pending commit status, writes asset stats to file, writes asset diffs to file, and posts success commit status', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'dkg93hdk';
  const pr = '99';
  const resolveGlob = () => Promise.resolve(['dist/app.3u3232.js']);
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getAssetStatsSpy = createSpy().andReturn(
    Promise.resolve([
      {filepath: 'dist/app.h9832h.js', size: 500}
    ])
  );

  return subject({
    artifactsDirectory: 'djeh9h/artifacts',
    buildSha,
    buildUrl: 'http://circle.com/build/78',
    pullRequestId: Maybe.of(pr),
    thresholds: [{
      maxSize: Infinity,
      targets: 'dist/app.*.js'
    }],

    // Dependencies
    artifactStore: {
      getAssetStats: getAssetStatsSpy
    },
    getFileStats: () => Promise.resolve({size: 400}),
    makeGitHubRequest: fakeGitHubRequest(
      new Map([
        [`statuses/${buildSha}`, postCommitStatusSpy],
        [
          `pulls/${pr}`,
          () => ReaderPromise.of({
            base: {
              ref: 'master'
            }
          })
        ]
      ])
    ),
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

    expect(getAssetStatsSpy).toHaveBeenCalledWith('master', 'asset-stats.json');
  });
});

test('writes message to the console when no previous stat found for given filepath', () => {
  const logMessageSpy = createSpy();
  const getAssetStatsSpy = createSpy().andReturn(
    Promise.resolve([
      {filepath: 'dist/app.hfdsy4.js', size: 300}
    ])
  );

  return subject({
    baseBranch: 'develop',
    thresholds: [{
      maxSize: Infinity,
      targets: 'dist/vendor.*.js'
    }],

    // Dependencies
    artifactStore: {
      getAssetStats: getAssetStatsSpy
    },
    logMessage: logMessageSpy,
    resolveGlob: () => Promise.resolve(['dist/vendor.fdjsayr.js'])
  }).then(() => {
    const actual = R.view(firstCallFirstArgument, logMessageSpy);
    expect(actual).toBe('No previous stats found for dist/vendor.fdjsayr.js. Did you rename that file recently?');

    expect(getAssetStatsSpy).toHaveBeenCalledWith('develop', 'asset-stats.json');
  });
});

test('posts error commit status and logs message when previous build has no stats', () => {
  const pr = '653';
  const baseBranch = 'master';
  const buildSha = 'lnbs3hdk';
  const buildNumber = '78';
  const logMessageSpy = createSpy();
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getAssetStatsSpy = createSpy().andReturn(
    Promise.reject(
      NoAssetStatsArtifactFoundErr(baseBranch, buildNumber)
    )
  );

  return subject({
    buildSha,
    buildUrl: `http://circle.com/build/${buildNumber}`,
    pullRequestId: Maybe.of(pr),

    // Dependencies
    artifactStore: {
      getAssetStats: getAssetStatsSpy
    },
    logMessage: logMessageSpy,
    makeGitHubRequest: fakeGitHubRequest(
      new Map([
        [
          `statuses/${buildSha}`,
          postCommitStatusSpy
        ],
        [
          `pulls/${pr}`,
          () => ReaderPromise.of({
            base: {
              ref: baseBranch
            }
          })
        ]
      ])
    )
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

    expect(getAssetStatsSpy).toHaveBeenCalledWith(baseBranch, 'asset-stats.json');
  });
});

test('posts error commit status and logs message when no previous builds are found', () => {
  const pr = '3';
  const baseBranch = 'develop';
  const buildSha = 'ng832hfd';
  const logMessageSpy = createSpy();
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getAssetStatsSpy = createSpy().andReturn(
    Promise.reject(
      NoRecentBuildsFoundErr(baseBranch)
    )
  );

  return subject({
    buildSha,
    buildUrl: 'http://circle.com/build/139',
    pullRequestId: Maybe.of(pr),

    // Dependencies
    artifactStore: {
      getAssetStats: getAssetStatsSpy
    },
    logMessage: logMessageSpy,
    makeGitHubRequest: fakeGitHubRequest(
      new Map([
        [`statuses/${buildSha}`, postCommitStatusSpy],
        [
          `pulls/${pr}`,
          () => ReaderPromise.of({
            base: {
              ref: baseBranch
            }
          })
        ]
      ])
    )
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

    expect(getAssetStatsSpy).toHaveBeenCalledWith(baseBranch, 'asset-stats.json');
  });
});

test('writes asset stats and posts success commit status with asset stats (and a note explaining that diffs could not be calculated) when open pull request is not found', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'ljghay3h';
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const logMessageSpy = createSpy();
  const gitHubRequestHandlers = new Map([
    [`statuses/${buildSha}`, postCommitStatusSpy]
  ]);

  return subject({
    artifactsDirectory: '83jgs3/artifacts',
    buildSha,
    buildUrl: 'http://circle.com/build/29',
    pullRequestId: Maybe.None(),
    thresholds: [{
      maxSize: Infinity,
      targets: 'dist/main.*.js'
    }],

    // Dependencies
    getFileStats: () => Promise.resolve({size: 258}),
    logMessage: logMessageSpy,
    makeGitHubRequest: fakeGitHubRequest(gitHubRequestHandlers),
    resolveGlob: () => Promise.resolve(['build/main.38552hd3.js']),
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
  const assetPath = 'build.3u3232.js';
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getAssetStatsSpy = createSpy().andReturn(
    Promise.resolve([
      {filepath: assetPath, size: 200}
    ])
  );

  return subject({
    buildSha,
    buildUrl: 'http://circle.com/build/21',
    pullRequestId: Maybe.of(pr),
    thresholds: [{
      maxSize: 300,
      targets: '*.js'
    }],

    // Dependencies
    artifactStore: {
      getAssetStats: getAssetStatsSpy
    },
    getFileStats: () => Promise.resolve({size: 400}),
    makeGitHubRequest: fakeGitHubRequest(
      new Map([
        [`statuses/${buildSha}`, postCommitStatusSpy],
        [
          `pulls/${pr}`,
          () => ReaderPromise.of({
            base: {
              ref: 'master'
            }
          })
        ]
      ])
    ),
    resolveGlob: () => Promise.resolve([assetPath]),
    writeFile: writeFileSpy
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

    expect(getAssetStatsSpy).toHaveBeenCalledWith('master', 'asset-stats.json');
  });
});

test('posts success commit status when failure thresholds are met', () => {
  const writeFileSpy = createSpy();
  const buildSha = 'algh83he';
  const pr = '200';
  const assetPath = 'app.dj39hf.js';
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getAssetStatsSpy = createSpy().andReturn(
    Promise.resolve([
      {filepath: assetPath, size: 400}
    ])
  );

  return subject({
    buildSha,
    buildUrl: 'http://circle.com/build/29',
    pullRequestId: Maybe.of(pr),
    thresholds: [{
      maxSize: 550,
      targets: '*.js'
    }],

    // Dependencies
    artifactStore: {
      getAssetStats: getAssetStatsSpy
    },
    getFileStats: () => Promise.resolve({size: 267}),
    makeGitHubRequest: fakeGitHubRequest(
      new Map([
        [`statuses/${buildSha}`, postCommitStatusSpy],
        [
          `pulls/${pr}`,
          () => ReaderPromise.of({
            base: {
              ref: 'master'
            }
          })
        ]
      ])
    ),
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

    expect(getAssetStatsSpy).toHaveBeenCalledWith('master', 'asset-stats.json');
  });
});
