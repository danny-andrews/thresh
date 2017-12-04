import R from 'ramda';
import test from 'ava';
import expect, {createSpy} from 'expect';
import circleciWeighIn from '../circleci-weigh-in';
import ReaderPromise from '../core/reader-promise';
import {Maybe} from 'monet';

const configFac = (config = {}) => ({
  logMessage: () => {},
  logError: () => {},
  ...config
});

const subject = (opts = {}) =>
  circleciWeighIn({
    statsFilepath: 'dist/stats.js',
    projectName: 'my-project',
    failureThresholds: [],
    buildSha: '8fdhihfj',
    buildUrl: 'http://circle.com/my-build',
    pullRequestId: Maybe.of('f820yf3h'),
    artifactsDirectory: 'lfjk3208hohefi4/artifacts',
    effects: {
      retrieveBaseBundleSizes: () => ReaderPromise.of({}),
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
    ...R.omit(['effects'], opts)
  });

test('happy path (makes artifact directory, writes bundle stats to file, and writes bundle diffs to file)', () => {
  const writeBundleDiffsSpy = createSpy().andReturn(ReaderPromise.of());
  const writeBundleSizesSpy = createSpy().andReturn(ReaderPromise.of());
  const makeArtifactDirectorySpy = createSpy().andReturn(ReaderPromise.of());

  return subject({
    effects: {
      writeBundleDiffs: writeBundleDiffsSpy,
      writeBundleSizes: writeBundleSizesSpy,
      makeArtifactDirectory: makeArtifactDirectorySpy,
      readStats: () => ReaderPromise.of({
        assetsByChunkName: {
          app: 'dist/app.js'
        },
        assets: [
          {name: 'dist/app.js', size: 452}
        ]
      })
    }
  }).run(configFac()).then(() => {
    const firstCallFirstArgument = R.path(['calls', 0, 'arguments', 0]);
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
        size: 452,
        path: 'dist/app.js'
      }
    });

    expect(bundleDiffRootPath).toEqual('lfjk3208hohefi4/artifacts');
    expect(bundleDiffProjectName).toEqual('my-project');
    expect(bundleDiffContents).toEqual({});

    expect(thresholdFailures).toEqual([]);
  });
});

test('handles case where no open pull request is found', () =>
  subject({pullRequestId: Maybe.None()}).run(configFac())
);

test('surfaces errors reading stats file', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      readFile: () => ReaderPromise.fromError({message: 'oh noes'})
    }
  }).run(configFac()).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('oh noes');
  });
});

test('surfaces errors making artifact directory', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      makeArtifactDirectory: () => ReaderPromise.fromError({message: 'oh noes'})
    }
  }).run(
    configFac({logError: logErrorSpy})
  ).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('oh noes');
  });
});

test('surfaces errors writing bundle sizes', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      writeBundleSizes: () => ReaderPromise.fromError({message: 'uh oh'})
    }
  }).run(
    configFac({logError: logErrorSpy})
  ).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('uh oh');
  });
});

test('surfaces errors writing bundle diffs', () => {
  const logErrorSpy = createSpy();

  return subject({
    effects: {
      writeBundleDiffs: () => ReaderPromise.fromError({message: 'uh oh'})
    }
  }).run(configFac({logError: logErrorSpy})).catch(() => {
    expect(logErrorSpy).toHaveBeenCalledWith('uh oh');
  });
});
