import test from 'ava';
import expect from 'expect';
import readStats from '../read-stats';
import {PromiseError} from '../../test/helpers';
import {StatsFileReadErr} from '../../core/errors';

const subject = ({
  readFile = () => Promise.resolve(),
  statsFilepath = 'dist/stats.json'
} = {}) => readStats({statsFilepath}).run({readFile});

test('returns parsed contents of stats file', () =>
  subject({
    readFile: () => Promise.resolve('"blah blah"')
  }).then(contents => {
    expect(contents).toBe('blah blah');
  })
);

test('returns StatsFileReadErr when an error is encountered reading stats file', () =>
  subject({readFile: () => PromiseError('oh no')}).catch(err => {
    expect(err).toEqual(StatsFileReadErr('Error: oh no'));
  })
);

test('returns StatsFileReadErr when an error is encountered parsing stats file contents', () =>
  subject({writeFile: () => Promise.resolve('no valid JSON')}).catch(err => {
    expect(err).toEqual(StatsFileReadErr('SyntaxError: Unexpected token u in JSON at position 0'));
  })
);
