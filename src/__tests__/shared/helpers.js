import R from 'ramda';
import {Response} from 'node-fetch';

export const ResponsePromise = R.pipe(
  JSON.stringify,
  a => new Response(a),
  a => Promise.resolve(a),
);

export const FakeFetch = (handlers = []) => (...args) => {
  const [url] = args;
  const handler = handlers.find(({matcher}) => {
    const type = R.type(matcher);
    switch(type) {
    case 'Function':
      return matcher(...args);
    case 'RegExp':
      return url.match(matcher);
    default:
      throw new Error(`Unsupported handler type: ${type}`);
    }
  });
  if(!handler) {
    throw new Error(`No response for ${args.join(' ')}`);
  }
  const {response} = handler;

  return R.type(response) === 'Function'
    ? ResponsePromise(response(...args))
    : ResponsePromise(response);
};
