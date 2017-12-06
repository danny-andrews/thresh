const path = require('path');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');

module.exports = {
  entry: {
    'circleci-weigh-in': path.resolve(__dirname, 'index')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: module => module.context
        && module.context.indexOf('node_modules') !== -1
    }),
    new ManifestPlugin()
  ]
};
