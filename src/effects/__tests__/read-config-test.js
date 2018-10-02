import test from 'ava';
import expect from 'expect';

import readConfig from '../read-config';
import {PromiseError} from '../../test/helpers';
import {ConfigFileReadErr} from '../../core/errors';

const subject = ({
  readFile = () => Promise.resolve(),
  configFilepath = 'config.toml'
} = {}) => readConfig(configFilepath).run({readFile});

test('returns parsed contents of config', () => subject({
  readFile: () => Promise.resolve('key = "value"')
}).then(contents => {
  expect(contents).toEqual({key: 'value'});
}));

test('returns ConfigFileReadErr when an error is encountered reading stats file', () => subject({
  readFile: () => PromiseError('oh no')
}).catch(({message, constructor}) => {
  expect(message).toEqual('Error reading config file: Error: oh no!');
  expect(constructor).toEqual(ConfigFileReadErr);
}));

test('returns ConfigFileReadErr when an error is encountered parsing stats file contents', () => subject({
  writeFile: () => Promise.resolve(';')
}).catch(({message, constructor}) => {
  expect(message).toEqual("Error reading config file: TypeError: Cannot read property 'toString' of undefined!");
  expect(constructor).toEqual(ConfigFileReadErr);
}));
