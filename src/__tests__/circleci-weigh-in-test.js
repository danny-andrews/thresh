import R from 'ramda';
import test from 'ava';
import expect, {createSpy} from 'expect';
import {
  NoOpenPullRequestFoundErr,
  InvalidFailureThresholdErr,
  InvalidFailureThresholdOptionErr
} from '../core/errors';
import circleciWeighIn from '../circleci-weigh-in';
import ReaderPromise from '../core/reader-promise';
import {Maybe} from 'monet';

const subject = (opts = {}) => {
  const {logError = () => {}, logMessage = () => {}, ...rest} = opts;

  return circleciWeighIn({
    statsFilepath: 'dist/stats.js',
    projectName: 'my-project',
    failureThresholds: [],
    buildSha: '8fdhihfj',
    buildUrl: 'http://circle.com/my-build',
    pullRequestId: Maybe.of('f820yf3h'),
    artifactsDirectory: 'lfjk3208hohefi4/artifacts',
    effects: {
      retrieveBaseBundleSizes: () => ReaderPromise.of({
        'app.js': {
          size: 300,
          path: 'dist/app.js'
        }
      }),
      postFinalPrStatus: () => ReaderPromise.of(),
      postPendingPrStatus: () => ReaderPromise.of(),
      postErrorPrStatus: () => ReaderPromise.of(),
      readStats: () => ReaderPromise.of({
        assetsByChunkName: {
          app: 'dist/app.js'
        },
        assets: [
          {name: 'dist/app.js', size: 452}
        ]
      }),
      resolve: (...args) => ReaderPromise.of(['/root/builds', args.join('/')].join('/')),
      makeArtifactDirectory: () => ReaderPromise.of(),
      writeBundleSizes: () => ReaderPromise.of(),
      writeBundleDiffs: () => ReaderPromise.of(),
      ...(opts.effects ? opts.effects : {})
    },
    ...R.omit(['effects'], rest)
  }).run({logMessage, logError});
};

const firstCallFirstArgument = R.path(['calls', 0, 'arguments', 0]);

test('happy path (makes artifact directory, writes bundle stats to file, and writes bundle diffs to file)', () => {
  const writeBundleDiffsSpy = createSpy().andReturn(ReaderPromise.of());
  const writeBundleSizesSpy = createSpy().andReturn(ReaderPromise.of());
  const makeArtifactDirectorySpy = createSpy().andReturn(ReaderPromise.of());

  return subject({
    failureThresholds: [{targets: 'app.js', maxSize: 50}],
    effects: {
      writeBundleDiffs: writeBundleDiffsSpy,
      writeBundleSizes: writeBundleSizesSpy,
      makeArtifactDirectory: makeArtifactDirectorySpy,
      readStats: () => ReaderPromise.of({
        assetsByChunkName: {
          app: 'dist/app.js'
        },
        assets: [
          {name: 'dist/app.js', size: 200}
        ]
      }),
      retrieveBaseBundleSizes: () => ReaderPromise.of({
        'app.js': {
          size: 20,
          path: 'dist/app.js'
        }
      })
    }
  }).then(() => {
    const {
      rootPath: bundleStatsRootPath,
      projectName: bundleStatsProjectName,
      bundleSizes: bundleStatsContents
    } = firstCallFirstArgument(writeBundleSizesSpy);

    const {
      rootPath: bundleDiffRootPath,
      projectName: bundleDiffProjectName,
      bundleDiffs: bundleDiffContents,
      thresholdFailures
    } = firstCallFirstArgument(writeBundleDiffsSpy);

    expect(makeArtifactDirectorySpy).toHaveBeenCalledWith({
      rootPath: 'lfjk3208hohefi4/artifacts',
      projectName: 'my-project'
    });

    expect(bundleStatsRootPath).toEqual('lfjk3208hohefi4/artifacts');
    expect(bundleStatsProjectName).toEqual('my-project');
    expect(bundleStatsContents).toEqual({
      'app.js': {
        path: 'dist/app.js',
        size: 200
      }
    });

    expect(bundleDiffRootPath).toEqual('lfjk3208hohefi4/artifacts');
    expect(bundleDiffProjectName).toEqual('my-project');
    expect(bundleDiffContents).toEqual({
      'app.js': {
        current: 200,
        difference: 180,
        original: 20,
        percentChange: 900
      }
    });

    expect(thresholdFailures).toEqual([{
      message: '"app.js" (200B) must be less than or equal to 50B!',
      threshold: {strategy: 'any', targets: 'app.js', maxSize: 50},
      offendingAssets: ['app.js']
    }]);
  });
});

test("defaults projectName to ''", () => {
  const makeArtifactDirectorySpy = createSpy().andReturn(ReaderPromise.of());

  return subject({
    projectName: undefined,
    effects: {
      makeArtifactDirectory: makeArtifactDirectorySpy
    }
  }).then(() => {
    const {projectName} = firstCallFirstArgument(makeArtifactDirectorySpy);
    expect(projectName).toBe('');
  });
});

test('returns error when non-schema-matching failure threshold is provided', () =>
  subject({
    failureThresholds: [{targets: '.js'}]
  }).catch(err => {
    expect(err).toEqual(InvalidFailureThresholdOptionErr("data[0] should have required property 'maxSize'"));
  })
);

test('handles case where no open pull request is found', () => {
  const logMessageSpy = createSpy();

  return subject({pullRequestId: Maybe.None(), logMessage: logMessageSpy})
    .then(() => {
      expect(logMessageSpy)
        .toHaveBeenCalledWith(NoOpenPullRequestFoundErr().message);
    });
});

test('handles invalid failure threshold case', () => {
  const logErrorSpy = createSpy();

  return subject({
    logError: logErrorSpy,
    readStats: () => ReaderPromise.of({
      assetsByChunkName: {
        app: 'dist/app.js'
      },
      assets: [
        {name: 'dist/app.js', size: 32432}
      ]
    }),
    failureThresholds: [{targets: '.css', maxSize: 45}]
  }).catch(() => {
    expect(logErrorSpy)
      .toHaveBeenCalledWith(InvalidFailureThresholdErr('.css').message);
  });
});

test('surfaces errors reading stats file', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      readStats: () => ReaderPromise.fromError({message: 'oh noes'})
    },
    logError: logErrorSpy
  }).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('oh noes');
  });
});

test('surfaces errors making artifact directory', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      makeArtifactDirectory: () => ReaderPromise.fromError({message: 'oh noes'})
    },
    logError: logErrorSpy
  }).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('oh noes');
  });
});

test('surfaces errors writing bundle sizes', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      writeBundleSizes: () => ReaderPromise.fromError({message: 'uh oh'})
    },
    logError: logErrorSpy
  }).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('uh oh');
  });
});

test('surfaces errors writing bundle diffs', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      writeBundleDiffs: () => ReaderPromise.fromError({message: 'uh oh'})
    },
    logError: logErrorSpy
  }).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('uh oh');
  });
});
