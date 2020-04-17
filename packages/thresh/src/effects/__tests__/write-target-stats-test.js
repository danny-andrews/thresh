import test from 'ava';
import expect, {createSpy} from 'expect';

import writeTargetStats from '../write-target-stats';
import {TargetStatsWriteErr} from '../../core/errors';

const subject = ({
  writeFile = () => Promise.resolve(),
  resolve = (...args) => args.join('/'),
  rootPath = 'root',
  targetStats = {}
} = {}) => writeTargetStats(targetStats, rootPath).run({writeFile, resolve});

test('writes target stats file', () => {
  const writeFileSpy = createSpy().andReturn(Promise.resolve());

  return subject({
    rootPath: 'dist',
    targetStats: {
      'app.css': {
        size: 213,
        path: 'app.css'
      }
    },
    writeFile: writeFileSpy
  }).then(() => {
    expect(writeFileSpy).toHaveBeenCalledWith(
      'dist/thresh/target-stats.json',
      JSON.stringify({
        'app.css': {
          size: 213,
          path: 'app.css'
        }
      }, null, 2)
    );
  });
});

test('returns error when an error is encountered writing target stats file', () => subject({
  writeFile: () => Promise.reject(Error())
}).catch(({message, constructor}) => {
  expect(constructor).toBe(TargetStatsWriteErr);
  expect(message).toBe('Error writing target stats artifact');
}));
