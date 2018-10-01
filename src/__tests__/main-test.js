import test from 'ava';
import expect, {createSpy} from 'expect';
import {Maybe, Either} from 'monet';

import {
  NoOpenPullRequestFoundErr,
  NoPreviousStatsFoundForFilepath
} from '../core/errors';
import main from '../main';
import ReaderPromise from '../shared/reader-promise';
import {firstCallFirstArgument, firstCallArguments} from '../test/helpers';

const defaultAssetSize = {
  'app.js': {
    size: 300,
    path: 'dist/app.js'
  }
};

const subject = (opts = {}) => main({
  artifactsDirectory: 'lfjk3208hohefi4/artifacts',
  buildSha: '8fdhihfj',
  buildUrl: 'http://circle.com/my-build',
  failureThresholds: [],
  getAssetFileStats: () => ReaderPromise.of([{
    size: 242,
    filename: 'app.js',
    path: 'dist/app.js'
  }]),
  getBaseBranch: ReaderPromise.of,
  makeArtifactDirectory: () => ReaderPromise.of(),
  manifestFilepath: 'dist/manifest.json',
  outputDirectory: 'dist',
  postErrorCommitStatus: ReaderPromise.of,
  postFinalCommitStatus: ReaderPromise.of,
  postPendingCommitStatus: ReaderPromise.of,
  projectName: Maybe.None(),
  pullRequestId: Maybe.of('f820yf3h'),
  readManifest: () => ReaderPromise.of({'app.js': 'app.js'}),
  saveStats: ReaderPromise.of,
  writeAssetDiffs: ReaderPromise.of,
  writeAssetStats: ReaderPromise.of,
  ...opts
}).run({
  artifactStore: {
    getAssetStats: () => Promise.resolve(
      Either.Right(defaultAssetSize)
    )
  },
  logMessage: () => {},
  ...opts
});

test('happy path (makes artifact directory, writes asset stats to file, and writes asset diffs to file)', () => {
  const writeAssetDiffsSpy = createSpy().andReturn(ReaderPromise.of());
  const writeAssetStatsSpy = createSpy().andReturn(ReaderPromise.of());
  const makeArtifactDirectorySpy = createSpy().andReturn(ReaderPromise.of());
  const originalAssetSizes = {
    'app.js': {
      size: 20,
      path: 'dist/app.js'
    }
  };

  return subject({
    artifactStore: {
      getAssetStats: () => Promise.resolve(
        Either.Right(originalAssetSizes)
      )
    },
    failureThresholds: [{targets: 'app.js', maxSize: 50, strategy: 'any'}],
    outputDirectory: 'dist',
    makeArtifactDirectory: makeArtifactDirectorySpy,
    getAssetFileStats: () => ReaderPromise.of([{
      size: 200,
      filename: 'app.js',
      path: 'dist/app.js'
    }]),
    readManifest: () => ReaderPromise.of({'app.js': 'app.js'}),
    writeAssetDiffs: writeAssetDiffsSpy,
    writeAssetStats: writeAssetStatsSpy
  }).then(() => {
    const [assetStatsContents, assetStatsRootPath] =
      firstCallArguments(writeAssetStatsSpy);

    const {
      rootPath: assetDiffsRootPath,
      assetDiffs: assetDiffsContents,
      thresholdFailures
    } = firstCallFirstArgument(writeAssetDiffsSpy);

    expect(makeArtifactDirectorySpy).toHaveBeenCalledWith({
      rootPath: 'lfjk3208hohefi4/artifacts'
    });

    expect(assetStatsRootPath).toEqual('lfjk3208hohefi4/artifacts');
    expect(assetStatsContents).toEqual({
      'app.js': {
        path: 'dist/app.js',
        size: 200
      }
    });

    expect(assetDiffsRootPath).toEqual('lfjk3208hohefi4/artifacts');
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

test('returns error when non-schema-matching failure threshold is provided', () => subject({
  failureThresholds: [{targets: '.js', strategy: 'any'}]
}).catch(err => {
  expect(err.message).toBe(
    "failure-thresholds' option is invalid. Problem(s):\ndata[0] should have required property 'maxSize'"
  );
}));

test('handles case where no open pull request is found', () => {
  const logMessageSpy = createSpy();

  return subject({pullRequestId: Maybe.None(), logMessage: logMessageSpy})
    .then(() => {
      expect(logMessageSpy)
        .toHaveBeenCalledWith(NoOpenPullRequestFoundErr().message);
    });
});

test('handles invalid failure threshold case', () => subject({
  getFileStats: () => Promise.resolve({size: 32432}),
  readManifest: () => ReaderPromise.of({'app.js': 'app.js'}),
  failureThresholds: [{targets: '.css', maxSize: 45, strategy: 'any'}]
}).catch(err => {
  expect(err.message)
    .toBe('Invalid failure threshold provided. No targets found for target: [.css]');
}));

test('surfaces errors reading stats file', () => subject({
  readManifest: () => ReaderPromise.fromError({message: 'oh noes'})
}).catch(err => {
  expect(err.message).toBe('oh noes');
}));

test('surfaces errors making artifact directory', () => subject({
  makeArtifactDirectory: () => ReaderPromise.fromError({message: 'oh noes'})
}).catch(err => {
  expect(err.message).toBe('oh noes');
}));

test('surfaces errors writing asset sizes', () => subject({
  writeAssetStats: () => ReaderPromise.fromError({message: 'uh oh'})
}).catch(err => {
  expect(err.message).toBe('uh oh');
}));

test('surfaces errors writing asset diffs', () => subject({
  writeAssetDiffs: () => ReaderPromise.fromError({message: 'uh oh'})
}).catch(err => {
  expect(err.message).toBe('uh oh');
}));

test('saves stats to local db when project name is given', () => {
  const saveStatsSpy = createSpy().andCall(ReaderPromise.of);
  const originalAssetSizes = {
    'other-proj': {
      'app.js': {
        size: 300,
        path: 'dist/app.js'
      }
    },
    'my-proj': {
      'app.js': {
        size: 242,
        path: 'dist/app.js'
      }
    }
  };

  return subject({
    projectName: Maybe.of('my-proj'),
    artifactStore: {
      getAssetStats: () => Promise.resolve(
        Either.Right(originalAssetSizes)
      )
    },
    getAssetFileStats: () => ReaderPromise.of([{
      filename: 'app.js',
      size: 983,
      path: 'dist/app.js'
    }]),
    saveStats: saveStatsSpy
  }).then(() => {
    expect(saveStatsSpy).toHaveBeenCalledWith({
      'other-proj': {
        'app.js': {
          size: 300,
          path: 'dist/app.js'
        }
      },
      'my-proj': {
        'app.js': {
          size: 983,
          path: 'dist/app.js'
        }
      }
    });
  });
});

test('writes message to the console when no previous stat found for given filepath', () => {
  const logMessageSpy = createSpy();

  return subject({
    logMessage: logMessageSpy,
    getAssetFileStats: () => ReaderPromise.of([{
      size: 100,
      filename: 'vendor.js',
      path: 'dist/vendor.js'
    }]),
    artifactStore: {
      getAssetStats: () => Promise.resolve(
        Either.Right({
          'app.js': {
            size: 100,
            path: 'dist/app.js'
          }
        })
      )
    }
  }).then(() => {
    expect(logMessageSpy)
      .toHaveBeenCalledWith(NoPreviousStatsFoundForFilepath('vendor.js').message);
  });
});

test.todo('handles case where previous build has no stats for current project');

test.todo('posts error PR status when error is encountered');
