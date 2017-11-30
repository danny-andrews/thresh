import R from 'ramda';
import test from 'ava';
import expect, {createSpy} from 'expect';
import circleciWeighIn from '../circleci-weigh-in';
import ReaderPromise from '../core/reader-promise';
import {Maybe} from 'monet';
import {
  StatsFileReadErr,
  ErrorWritingBundleDiffArtifactErr,
  NoOpenPullRequestFoundErr
} from '../core/errors';
import {parseJSON} from '../shared';

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
      writeBundleDiff: () => ReaderPromise.of(),
      ...(opts.effects ? opts.effects : {})
    },
    ...R.omit(['effects'], opts)
  });

test('happy path (makes artifact directory, writes bundle stats to file, and writes bundle diffs to file)', () => {
  const writeBundleDiffSpy = createSpy().andReturn(ReaderPromise.of());
  const writeBundleSizesSpy = createSpy().andReturn(ReaderPromise.of());
  const makeArtifactDirectorySpy = createSpy().andReturn(ReaderPromise.of());

  return subject({
    effects: {
      writeBundleDiff: writeBundleDiffSpy,
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
    } = firstCallFirstArgument(writeBundleDiffSpy);

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
  subject({pullRequestId: Maybe.None()}).run(configFac()).catch(err => {
    expect(err.message).toBe(NoOpenPullRequestFoundErr().message);
  })
);

test('surfaces errors reading stats file', () =>
  subject({
    effects: {
      readFile: () => Promise.reject('oh noes')
    }
  }).run(configFac()).catch(err => {
    expect(err.message).toBe(StatsFileReadErr('Error: oh noes').message);
  })
);

test('surfaces JSON parse errors for stats file', () => {
  const fileContents = 'not JSON';

  return subject({
    effects: {
      readFile: () => Promise.resolve(fileContents)
    }
  }).run(configFac()).catch(err => {
    expect(err.message)
      .toBe(StatsFileReadErr(parseJSON(fileContents).left()).message);
  });
});

test('surfaces errors making artifact directory', () =>
  subject({
    effects: {
      makeArtifactDirectory: () => ReaderPromise.fromError('oh noes')
    }
  }).run(configFac()).catch(err => {
    expect(err).toBe('oh noes');
  })
);

test('surfaces errors writing bundle sizes', () =>
  subject({
    effects: {
      writeBundleSizes: () => ReaderPromise.fromError('uh oh')
    }
  }).run(configFac()).catch(err => {
    expect(err).toBe('uh oh');
  })
);

test('surfaces errors writing bundle diffs', () =>
  subject({
    effects: {
      writeFile: path => (
        path.match(/bundle-sizes-diff\.json/)
          ? Promise.reject('uh oh')
          : Promise.resolve()
      )
    }
  }).run(configFac()).catch(err => {
    console.log(err);
    expect(err.message)
      .toBe(ErrorWritingBundleDiffArtifactErr('Error: uh oh').message);
  })
);
