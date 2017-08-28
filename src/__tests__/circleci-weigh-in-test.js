import test from 'ava';
import expect, {createSpy} from 'expect';
import R from 'ramda';
import subject from '../circleci-weigh-in';
import {artifactFac, integrationFetchSpyFac} from './factories';
import {Maybe} from 'monet';
import {
  StatsFileReadErr,
  ErrorWritingBundleSizeArtifactErr,
  ErrorCreatingArtifactDirectoryErr
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
    request: integrationFetchSpyFac({
      getArtifactsResponse: [
        artifactFac({path: 'my-project/bundle-sizes.json'})
      ]
    }),
    resolve: fakeResolve,
    repoOwner: 'me',
    repoName: 'my-repo',
    githubApiToken: 'jd80hrouf',
    circleApiToken: 'djfsayr3h2',
    ...config
  };
};

test('happy path', () => {
  const writeFileSpy = createSpy().andReturn(Promise.resolve());
  const mkdirSpy = createSpy().andReturn(Promise.resolve());
  const fakeResolve = (...args) => ['/root', 'builds', args.join('/')].join('/');
  const config = {
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
    request: integrationFetchSpyFac({
      getArtifactsResponse: [
        artifactFac({path: 'my-project/bundle-sizes.json'})
      ]
    }),
    resolve: fakeResolve
  };

  return fac().run(config).then(() => {
    const expectedStats = {
      'app.js': {
        size: 452,
        path: 'dist/app.js'
      }
    };
    const expectedFailures = {diffs: {}, failures: []};

    const [{
      arguments: [bundleStatsPath, bundleStatsContents]
    },
    {
      arguments: [bundleDiffPath, bundleDiffContents]
    }] = writeFileSpy.calls;

    expect(mkdirSpy).toHaveBeenCalledWith('/root/builds/lfjk3208hohefi4/artifacts/my-project/circleci-weigh-in');
    expect(bundleStatsPath).toBe('/root/builds/lfjk3208hohefi4/artifacts/my-project/bundle-sizes.json');
    expect(bundleStatsContents).toEqual(JSON.stringify(expectedStats, null, 2));
    expect(bundleDiffPath).toBe('/root/builds/lfjk3208hohefi4/artifacts/my-project/bundle-sizes-diff.json');
    expect(bundleDiffContents)
      .toEqual(JSON.stringify(expectedFailures, null, 2));
  });
});

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
