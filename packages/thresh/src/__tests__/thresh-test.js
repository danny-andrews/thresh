import test from 'ava';
import expect, {createSpy} from 'expect';
import {Maybe} from 'monet';
import ReaderPromise from '@danny.andrews/reader-promise';
import {NoTargetStatsArtifactFoundErr, NoRecentBuildsFoundErr}
  from '@danny.andrews/thresh-artifact-store-circleci';
import TOML from '@iarna/toml';

import thresh from '../thresh';
import {serializeForFile} from '../shared';

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
    getTargetStats: () => Promise.resolve([])
  },
  getCommandLineArgs = () => Promise.resolve({'config-path': 'config.toml'}),
  getFileStats = () => Promise.resolve({size: 200}),
  logMessage = console.log,
  makeGitHubRequest,
  mkdir = () => Promise.resolve(),
  resolve = (...args) => [...args].join('/'),
  resolveGlob = () => Promise.resolve(),
  writeFile = () => Promise.resolve()
} = {}) => thresh().run({
  artifactStore,
  ciAdapter: {
    getEnvVars: () => Promise.resolve({
      artifactsDirectory,
      buildSha,
      buildUrl,
      pullRequestId
    })
  },
  getCommandLineArgs,
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
  readFile: () => Promise.resolve(
    TOML.stringify({thresholds})
  ),
  resolve,
  resolveGlob,
  writeFile
}).catch(console.error);

test('posts pending commit status, writes asset stats to file, writes asset diffs to file, and posts success commit status', () => {
  const buildSha = 'dkg93hdk';
  const pr = '99';
  const mkdirSpy = createSpy().andReturn(Promise.resolve());
  const writeFileSpy = createSpy();
  const resolveGlobSpy = createSpy().andReturn(
    Promise.resolve(['dist/app.3u3232.js'])
  );
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getTargetStatsSpy = createSpy().andReturn(
    Promise.resolve([
      {filepath: 'dist/app.h9832h.js', size: 500}
    ])
  );
  const getFileStatsSpy = createSpy().andReturn(Promise.resolve({size: 400}));

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
      getTargetStats: getTargetStatsSpy
    },
    getFileStats: getFileStatsSpy,
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
    mkdir: mkdirSpy,
    resolveGlob: resolveGlobSpy,
    writeFile: writeFileSpy
  }).then(() => {
    expect(mkdirSpy).toHaveBeenCalledWith('djeh9h/artifacts/thresh');
    expect(resolveGlobSpy).toHaveBeenCalledWith('dist/app.*.js');
    expect(getFileStatsSpy).toHaveBeenCalledWith('dist/app.3u3232.js');
    expect(writeFileSpy).toHaveBeenCalledWith(
      'djeh9h/artifacts/thresh/target-stats.json',
      serializeForFile([{
        filepath: 'dist/app.3u3232.js',
        size: 400
      }])
    );
    expect(writeFileSpy).toHaveBeenCalledWith(
      'djeh9h/artifacts/thresh/target-diffs.json',
      serializeForFile({
        diffs: [{
          targets: ['dist/app.*.js'],
          original: 500,
          current: 400,
          difference: -100,
          percentChange: -20
        }],
        failures: []
      })
    );
    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/dkg93hdk',
      {
        method: 'POST',
        body: {
          state: 'pending',
          targetUrl: 'http://circle.com/build/78#artifacts',
          context: 'Asset Sizes',
          description: 'Calculating asset diffs and threshold failures (if any)...'
        }
      }
    );
    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/dkg93hdk',
      {
        method: 'POST',
        body: {
          state: 'success',
          targetUrl: 'http://circle.com/build/78#artifacts',
          context: 'Asset Sizes',
          description: 'dist/app.*.js: 400B (-100B, -20.00%)'
        }
      }
    );
    expect(postCommitStatusSpy.calls.length).toBe(2);
    expect(getTargetStatsSpy).toHaveBeenCalledWith('master', 'target-stats.json');
  });
});

test('writes message to the console when no previous stat found for given filepath', () => {
  const logMessageSpy = createSpy();
  const getTargetStatsSpy = createSpy().andReturn(
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
      getTargetStats: getTargetStatsSpy
    },
    logMessage: logMessageSpy,
    resolveGlob: () => Promise.resolve(['dist/vendor.fdjsayr.js'])
  }).then(() => {
    expect(logMessageSpy).toHaveBeenCalledWith('No previous stats found for dist/vendor.fdjsayr.js. Did you rename that file recently?');
    expect(getTargetStatsSpy).toHaveBeenCalledWith('develop', 'target-stats.json');
  });
});

test('posts error commit status and logs message when previous build has no stats', () => {
  const pr = '653';
  const baseBranch = 'master';
  const buildSha = 'lnbs3hdk';
  const buildNumber = '78';
  const logMessageSpy = createSpy();
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getTargetStatsSpy = createSpy().andReturn(
    Promise.reject(
      NoTargetStatsArtifactFoundErr(baseBranch, buildNumber)
    )
  );

  return subject({
    buildSha,
    buildUrl: `http://circle.com/build/${buildNumber}`,
    pullRequestId: Maybe.of(pr),

    // Dependencies
    artifactStore: {
      getTargetStats: getTargetStatsSpy
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
    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/lnbs3hdk',
      {
        method: 'POST',
        body: {
          state: 'error',
          targetUrl: 'http://circle.com/build/78#artifacts',
          context: 'Asset Sizes',
          description: 'No target stats artifact found for latest build of: `master`. Build number: `78`.'
        }
      }
    );
    expect(logMessageSpy).toHaveBeenCalledWith('No target stats artifact found for latest build of: `master`. Build number: `78`.');
    expect(getTargetStatsSpy).toHaveBeenCalledWith(baseBranch, 'target-stats.json');
  });
});

test('posts error commit status and logs message when no previous builds are found', () => {
  const pr = '3';
  const baseBranch = 'develop';
  const buildSha = 'ng832hfd';
  const logMessageSpy = createSpy();
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getTargetStatsSpy = createSpy().andReturn(
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
      getTargetStats: getTargetStatsSpy
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
    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/ng832hfd',
      {
        method: 'POST',
        body: {
          state: 'error',
          targetUrl: 'http://circle.com/build/139#artifacts',
          context: 'Asset Sizes',
          description: 'No recent successful builds found for the base branch: `develop`.'
        }
      }
    );
    expect(logMessageSpy).toHaveBeenCalledWith('No recent successful builds found for the base branch: `develop`.');
    expect(getTargetStatsSpy).toHaveBeenCalledWith(baseBranch, 'target-stats.json');
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
    expect(writeFileSpy).toHaveBeenCalledWith(
      '83jgs3/artifacts/thresh/target-stats.json',
      serializeForFile([
        {
          filepath: 'build/main.38552hd3.js',
          size: 258
        }
      ])
    );

    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/ljghay3h',
      {
        method: 'POST',
        body: {
          state: 'success',
          targetUrl: 'http://circle.com/build/29#artifacts',
          context: 'Asset Sizes',
          description: 'build/main.38552hd3.js: 258B (no open PR; cannot calculate diffs)'
        }
      }
    );
    expect(postCommitStatusSpy.calls.length).toBe(2);
    expect(logMessageSpy).toHaveBeenCalledWith('No open pull request found. Skipping asset diff step.');
  });
});

test('posts failure commit status when thresholds are not met', () => {
  const buildSha = 'fjdk29uw';
  const pr = '200';
  const assetPath = 'build.3u3232.js';
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getTargetStatsSpy = createSpy().andReturn(
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
      getTargetStats: getTargetStatsSpy
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
    resolveGlob: () => Promise.resolve([assetPath])
  }).then(() => {
    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/fjdk29uw',
      {
        method: 'POST',
        body: {
          state: 'failure',
          targetUrl: 'http://circle.com/build/21#artifacts',
          context: 'Asset Sizes',
          description: 'The total size of ["build.3u3232.js"] (400B) must be less than or equal to 300B!'
        }
      }
    );
    expect(getTargetStatsSpy).toHaveBeenCalledWith('master', 'target-stats.json');
  });
});

test('posts success commit status when failure thresholds are met', () => {
  const buildSha = 'algh83he';
  const pr = '200';
  const assetPath = 'app.dj39hf.js';
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());
  const getTargetStatsSpy = createSpy().andReturn(
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
      getTargetStats: getTargetStatsSpy
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
    resolveGlob: () => Promise.resolve([assetPath])
  }).then(() => {
    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/algh83he',
      {
        method: 'POST',
        body: {
          state: 'success',
          targetUrl: 'http://circle.com/build/29#artifacts',
          context: 'Asset Sizes',
          description: '*.js: 267B (-133B, -33.25%)'
        }
      }
    );
    expect(getTargetStatsSpy).toHaveBeenCalledWith('master', 'target-stats.json');
  });
});

test('posts failure commit status and logs a message when a threshold does not resolve to any files', () => {
  const buildSha = 'algh83he';
  const pr = '325';
  const logMessageSpy = createSpy();
  const postCommitStatusSpy = createSpy().andReturn(ReaderPromise.of());

  return subject({
    buildSha,
    buildUrl: 'http://circle.com/build/29',
    pullRequestId: Maybe.of(pr),
    thresholds: [{
      maxSize: 300,
      targets: '*.js'
    }],

    // Dependencies
    logMessage: logMessageSpy,
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
    resolveGlob: () => Promise.resolve([])
  }).then(() => {
    expect(postCommitStatusSpy).toHaveBeenCalledWith(
      'statuses/algh83he',
      {
        method: 'POST',
        body: {
          state: 'error',
          targetUrl: 'http://circle.com/build/29#artifacts',
          context: 'Asset Sizes',
          description: 'Invalid failure threshold provided. No files found for target(s): [*.js]'
        }
      }
    );
    expect(logMessageSpy).toHaveBeenCalledWith('Invalid failure threshold provided. No files found for target(s): [*.js]');
  });
});
