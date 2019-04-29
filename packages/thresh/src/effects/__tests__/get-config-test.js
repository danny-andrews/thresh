import test from 'ava';
import expect, {createSpy} from 'expect';

import getConfig from '../get-config';
import {PromiseError} from '../../test/helpers';
import {ConfigFileReadErr, ConfigFileParseErr} from '../../core/errors';

const subject = ({
  readFile = () => Promise.resolve(),
  getCommandLineArgs = () => Promise.resolve({'config-path': 'config.toml'})
} = {}) => getConfig().run({readFile, getCommandLineArgs});

test('returns parsed contents of config', () => {
  const readFileSpy = createSpy().andReturn(Promise.resolve('key = "value"'));

  return subject({
    readFile: readFileSpy,
    getCommandLineArgs: () => Promise.resolve({
      'config-path': 'config/threshrc.toml'
    })
  }).then(contents => {
    expect(contents).toEqual({key: 'value'});
    expect(readFileSpy).toHaveBeenCalledWith('config/threshrc.toml');
  });
});

test('returns ConfigFileReadErr when an error is encountered reading stats file', () => subject({
  readFile: () => PromiseError()
}).catch(({message, constructor}) => {
  expect(message).toEqual('Error reading config file');
  expect(constructor).toEqual(ConfigFileReadErr);
}));

test('returns ConfigFileParseErr when an error is encountered parsing stats file contents', () => subject({
  writeFile: () => Promise.resolve(';')
}).catch(({message, constructor}) => {
  expect(message).toEqual('Error parsing config file');
  expect(constructor).toEqual(ConfigFileParseErr);
}));
