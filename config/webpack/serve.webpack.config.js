/*jslint node: true */
'use strict';

const path = require('path');
const webpackMerge = require('webpack-merge');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const NamedModulesPlugin = require('webpack/lib/NamedModulesPlugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const HotModuleReplacementPlugin = require('webpack/lib/HotModuleReplacementPlugin');

const skyPagesConfigUtil = require('../sky-pages/sky-pages.config');
const browser = require('../../cli/utils/browser');
const certResolver = require('../../cli/utils/cert-resolver');

const tsLoaderUtil = require('./ts-loader-rule');

/**
 * Returns the default webpackConfig.
 * @name getDefaultWebpackConfig
 * @returns {WebpackConfig} webpackConfig
 */
function getWebpackConfig(argv, skyPagesConfig) {

  /**
   * Opens the host service url.
   * @name WebpackPluginDone
   */
  function WebpackPluginDone() {

    let launched = false;
    this.plugin('done', (stats) => {
      if (!launched) {
        launched = true;
        browser(argv, skyPagesConfig, stats, this.options.devServer.port);
      }
    });
  }

  const common = require('./common.webpack.config').getWebpackConfig(skyPagesConfig, argv);

  // Revert to environment defaults when serving.
  delete common.optimization;

  return webpackMerge(common, {
    mode: 'development',

    devtool: 'source-map',

    watch: true,

    // Do not use hashes during a serve.
    output: {
      filename: '[name].js',
      chunkFilename: '[name].chunk.js'
    },

    module: {
      rules: [
        tsLoaderUtil.getRule(),
        // https://github.com/blackbaud/skyux-sdk-builder/issues/220
        // Limited to known node_module packages that do not target ES5.
        {
          test: /strip-ansi|ansi-regex/,
          include: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    },

    devServer: {
      compress: true,
      inline: true,
      stats: false,
      hot: argv.hmr,
      disableHostCheck: true,
      contentBase: path.join(process.cwd(), 'src', 'app'),
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      historyApiFallback: {
        index: skyPagesConfigUtil.getAppBase(skyPagesConfig)
      },
      https: {
        cert: certResolver.readCert(argv),
        key: certResolver.readKey(argv)
      },
      publicPath: skyPagesConfigUtil.getAppBase(skyPagesConfig)
    },

    plugins: [
      new NamedModulesPlugin(),
      WebpackPluginDone,
      new LoaderOptionsPlugin({
        context: __dirname,
        debug: true
      }),
      new HotModuleReplacementPlugin(),
      new ForkTsCheckerWebpackPlugin()
    ]
  });
}

module.exports = {
  getWebpackConfig: getWebpackConfig
};
