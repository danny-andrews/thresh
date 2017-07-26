const path = require('path');
const webpack = require('webpack');
const {StatsWriterPlugin} = require('webpack-stats-plugin');

module.exports = {
  entry: {
    'ol-apps': path.resolve(__dirname, 'index')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]'
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: module => module.context
        && module.context.indexOf('node_modules') !== -1
    }),
    new StatsWriterPlugin({fields: ['assetsByChunkName', 'assets']})
  ]
};

// Skfd
