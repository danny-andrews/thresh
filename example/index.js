/* eslint-disable no-magic-numbers, no-console */
const difference = require('ramda/src/difference');

const cool = difference([2, 4, 5], [5]);

console.log('cool', cool);
