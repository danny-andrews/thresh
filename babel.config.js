/* eslint-disable import/no-commonjs */
module.exports = api => {
  api.cache.never();

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: '6.10'
          }
        }
      ]
    ],
    plugins: [
      [
        '@babel/plugin-proposal-pipeline-operator',
        {proposal: 'minimal'}
      ]
    ]
  };
};
