/*jslint node: true */
'use strict';

const webpackMerge = require('webpack-merge');
const SaveMetadata = require('../../plugin/save-metadata');
const tsLoaderUtil = require('./ts-loader-rule');

/**
 * Returns the default webpackConfig.
 * @name getDefaultWebpackConfig
 * @returns {WebpackConfig} webpackConfig
 */
function getWebpackConfig(skyPagesConfig, argv) {
  const common = require('./common.webpack.config');
  const commonConfig = common.getWebpackConfig(skyPagesConfig, argv);

  return webpackMerge(commonConfig, {
    mode: 'production',

    devtool: false,

    module: {
      rules: [
        tsLoaderUtil.getRule()
      ]
    },
    plugins: [
      SaveMetadata
    ]
  });
}

module.exports = {
  getWebpackConfig: getWebpackConfig
};
