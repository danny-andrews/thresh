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
  const {
    logError = console.error,
    logMessage = console.log,
    getFileStats = R.pipe(a => Promise.resolve(a), R.always)({size: 452}),
    ...rest
  } = opts;

  return circleciWeighIn({
    statsFilepath: 'dist/stats.js',
    projectName: 'my-project',
    outputDirectory: '',
    failureThresholds: [],
    buildSha: '8fdhihfj',
    buildUrl: 'http://circle.com/my-build',
    pullRequestId: Maybe.of('f820yf3h'),
    artifactsDirectory: 'lfjk3208hohefi4/artifacts',
    effects: {
      retrieveAssetSizes: () => ReaderPromise.of({
        'app.js': {
          size: 300,
          path: 'dist/app.js'
        }
      }),
      postFinalPrStatus: () => ReaderPromise.of(),
      postPendingPrStatus: () => ReaderPromise.of(),
      postErrorPrStatus: () => ReaderPromise.of(),
      readManifest: () => ReaderPromise.of({'app.js': 'app.js'}),
      resolve: (...args) => ReaderPromise.of(['/root/builds', args.join('/')].join('/')),
      makeArtifactDirectory: () => ReaderPromise.of(),
      writeAssetStats: () => ReaderPromise.of(),
      writeAssetDiffs: () => ReaderPromise.of(),
      ...(opts.effects ? opts.effects : {})
    },
    ...R.omit(['effects'], rest)
  }).run({logMessage, logError, getFileStats});
};

const firstCallFirstArgument = R.path(['calls', 0, 'arguments', 0]);

test('happy path (makes artifact directory, writes asset stats to file, and writes asset diffs to file)', () => {
  const writeAssetDiffsSpy = createSpy().andReturn(ReaderPromise.of());
  const writeAssetStatsSpy = createSpy().andReturn(ReaderPromise.of());
  const makeArtifactDirectorySpy = createSpy().andReturn(ReaderPromise.of());

  return subject({
    getFileStats: R.pipe(a => Promise.resolve(a), R.always)({size: 200}),
    failureThresholds: [{targets: 'app.js', maxSize: 50}],
    outputDirectory: 'dist',
    effects: {
      writeAssetDiffs: writeAssetDiffsSpy,
      writeAssetStats: writeAssetStatsSpy,
      makeArtifactDirectory: makeArtifactDirectorySpy,
      readManifest: () => ReaderPromise.of({'app.js': 'app.js'}),
      retrieveAssetSizes: () => ReaderPromise.of({
        'app.js': {
          size: 20,
          path: 'dist/app.js'
        }
      })
    }
  }).then(() => {
    const {
      rootPath: assetStatsRootPath,
      projectName: assetStatsProjectName,
      assetStats: assetStatsContents
    } = firstCallFirstArgument(writeAssetStatsSpy);

    const {
      rootPath: assetDiffsRootPath,
      projectName: assetDiffsProjectName,
      assetDiffs: assetDiffsContents,
      thresholdFailures
    } = firstCallFirstArgument(writeAssetDiffsSpy);

    expect(makeArtifactDirectorySpy).toHaveBeenCalledWith({
      rootPath: 'lfjk3208hohefi4/artifacts',
      projectName: 'my-project'
    });

    expect(assetStatsRootPath).toEqual('lfjk3208hohefi4/artifacts');
    expect(assetStatsProjectName).toEqual('my-project');
    expect(assetStatsContents).toEqual({
      'app.js': {
        path: 'dist/app.js',
        size: 200
      }
    });

    expect(assetDiffsRootPath).toEqual('lfjk3208hohefi4/artifacts');
    expect(assetDiffsProjectName).toEqual('my-project');
    expect(assetDiffsContents).toEqual({
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

test('returns error when non-schema-matching failure threshold is provided', () => {
  const logErrorSpy = createSpy();

  return subject({
    failureThresholds: [{targets: '.js'}],
    logError: logErrorSpy
  }).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith(
      InvalidFailureThresholdOptionErr(
        "data[0] should have required property 'maxSize'"
      ).message
    );
  });
});

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
    getFileStats: R.pipe(a => Promise.resolve(a), R.always)({size: 32432}),
    logError: logErrorSpy,
    readManifest: () => ReaderPromise.of({'app.js': 'app.js'}),
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
      readManifest: () => ReaderPromise.fromError({message: 'oh noes'})
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

test('surfaces errors writing asset sizes', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      writeAssetStats: () => ReaderPromise.fromError({message: 'uh oh'})
    },
    logError: logErrorSpy
  }).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('uh oh');
  });
});

test('surfaces errors writing asset diffs', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      writeAssetDiffs: () => ReaderPromise.fromError({message: 'uh oh'})
    },
    logError: logErrorSpy
  }).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('uh oh');
  });
});
