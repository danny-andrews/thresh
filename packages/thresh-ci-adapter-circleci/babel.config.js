/* eslint-disable import/no-commonjs */
module.exports = api => {
  api.cache.never();

  return {extends: '../../babel.config.js'};
};
