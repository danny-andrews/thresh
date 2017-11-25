import test from 'ava';
import expect, {createSpy} from 'expect';
import R from 'ramda';
import subject from '../circleci-weigh-in';
import {FakeFetch} from './shared/helpers';
import {
  GetBaseBranchHandler,
  GetRecentBuildsHandler,
  GetArtifactsHandler,
  GetArtifactHandler
} from './shared/requests';
import {ArtifactResource, BuildResource, PrResource} from './shared/factories';
import {Maybe} from 'monet';
import {
  StatsFileReadErr,
  ErrorWritingBundleSizeArtifactErr,
  ErrorWritingBundleDiffArtifactErr,
  ErrorCreatingArtifactDirectoryErr,
  NoOpenPullRequestFoundErr
} from '../core/errors';
import {parseJSON, PromiseError} from '../shared';

const optsFac = (opts = {}) => ({
  statsFilepath: 'dist/stats.js',
  projectName: 'my-project',
  failureThresholds: [],
  buildSha: '8fdhihfj',
  buildUrl: 'http://circle.com/my-build',
  pullRequestId: Maybe.of('f820yf3h'),
  artifactsDirectory: 'lfjk3208hohefi4/artifacts',
  ...opts
});

const fac = R.pipe(optsFac, subject);

export const createResponseSequence = ({artifactPath} = {}) => {
  const artifactUrl = 'dist/stats.js';

  return [
    GetBaseBranchHandler(PrResource()),
    GetRecentBuildsHandler([
      BuildResource()
    ]),
    GetArtifactsHandler([
      ArtifactResource({path: artifactPath, url: artifactUrl})
    ]),
    GetArtifactHandler({
      response: '',
      matcher: new RegExp(artifactUrl)
    }),
    {response: '', matcher: () => true}
  ];
};

const configFac = (config = {}) => {
  const writeFileSpy = () => Promise.resolve();
  const mkdirSpy = () => Promise.resolve();
  const fakeResolve = (...args) => ['/root', 'builds', args.join('/')].join('/');

  return {
    readFile: () => R.pipe(JSON.stringify, a => Promise.resolve(a))({
      assetsByChunkName: {
        app: 'dist/app.js'
      },
      assets: [
        {name: 'dist/app.js', size: 452}
      ]
    }),
    writeFile: writeFileSpy,
    mkdir: mkdirSpy,
    request: FakeFetch(createResponseSequence({
      artifactPath: 'my-project/bundle-sizes.json'
    })),
    resolve: fakeResolve,
    repoOwner: 'me',
    repoName: 'my-repo',
    githubApiToken: 'jd80hrouf',
    circleApiToken: 'djfsayr3h2',
    ...config
  };
};

test('happy path (makes artifact directory, writes bundle stats to file, and writes bundle diffs to file)', () => {
  const fakeFetch = FakeFetch(
    createResponseSequence({
      artifactPath: 'my-project/bundle-sizes.json'
    })
  );
  const writeFileSpy = createSpy().andReturn(Promise.resolve());
  const mkdirSpy = createSpy().andReturn(Promise.resolve());
  const config = configFac({
    readFile: () => R.pipe(JSON.stringify, a => Promise.resolve(a))({
      assetsByChunkName: {
        app: 'dist/app.js'
      },
      assets: [
        {name: 'dist/app.js', size: 452}
      ]
    }),
    writeFile: writeFileSpy,
    mkdir: mkdirSpy,
    request: fakeFetch,
    resolve: (...args) => ['/root', 'builds', args.join('/')].join('/')
  });

  return fac().run(config).then(() => {
    const serialize = val => JSON.stringify(val, null, 2);
    const expectedStats = serialize({
      'app.js': {
        size: 452,
        path: 'dist/app.js'
      }
    });
    const expectedFailures = serialize({diffs: {}, failures: []});

    const [
      {arguments: [bundleStatsPath, bundleStatsContents]},
      {arguments: [bundleDiffPath, bundleDiffContents]}
    ] = writeFileSpy.calls;

    expect(mkdirSpy).toHaveBeenCalledWith('/root/builds/lfjk3208hohefi4/artifacts/circleci-weigh-in/my-project');
    expect(bundleStatsPath).toBe('/root/builds/lfjk3208hohefi4/artifacts/circleci-weigh-in/my-project/bundle-sizes.json');
    expect(bundleStatsContents).toEqual(expectedStats);
    expect(bundleDiffPath).toBe('/root/builds/lfjk3208hohefi4/artifacts/circleci-weigh-in/my-project/bundle-sizes-diff.json');
    expect(bundleDiffContents).toEqual(expectedFailures);
  });
});

test('handles case where no open pull request is found', () =>
  fac({pullRequestId: Maybe.None()}).run(configFac()).catch(err => {
    expect(err.message).toBe(NoOpenPullRequestFoundErr().message);
  })
);

test('surfaces errors reading stats file', () => {
  const config = configFac({
    readFile: () => PromiseError('oh noes')
  });

  return fac().run(config).catch(err => {
    expect(err.message).toBe(StatsFileReadErr('Error: oh noes').message);
  });
});

test('surfaces JSON parse errors for stats file', () => {
  const fileContents = 'not JSON';
  const config = configFac({
    readFile: () => Promise.resolve(fileContents)
  });

  return fac().run(config).catch(err => {
    expect(err.message)
      .toBe(StatsFileReadErr(parseJSON(fileContents).left()).message);
  });
});

test('surfaces errors making artifact directory', () => {
  const config = configFac({
    mkdir: () => PromiseError('oh noes')
  });

  return fac().run(config).catch(err => {
    expect(err.message)
      .toBe(ErrorCreatingArtifactDirectoryErr('Error: oh noes').message);
  });
});

test('surfaces errors writing bundle sizes', () => {
  const config = configFac({
    writeFile: () => PromiseError('uh oh')
  });

  return fac().run(config).catch(err => {
    expect(err.message)
      .toBe(ErrorWritingBundleSizeArtifactErr('Error: uh oh').message);
  });
});

test('surfaces errors writing bundle diffs', () => {
  const config = configFac({
    writeFile: path => (
      path.match(/bundle-sizes-diff\.json/)
        ? PromiseError('uh oh')
        : Promise.resolve()
    )
  });

  return fac().run(config).catch(err => {
    expect(err.message)
      .toBe(ErrorWritingBundleDiffArtifactErr('Error: uh oh').message);
  });
});
