/*jshint node: true*/
'use strict';

/**
 * Requires the shared karma config and sets any local properties.
 * @name getConfig
 * @param {Object} config
 */
function getConfig(config) {

  const path = require('path');

  const DefinePlugin = require('webpack/lib/DefinePlugin');
  const testWebpackConfig = require('../webpack/test.webpack.config');
  const skyPagesConfigUtil = require('../sky-pages/sky-pages.config');
  const testKarmaConf = require('./test.karma.conf');

  const runtimePath = path.resolve(process.cwd(), 'runtime');
  const srcPath = path.resolve(process.cwd(), 'src', 'app');
  const skyPagesConfig = skyPagesConfigUtil.getSkyPagesConfig('test');
  let webpackConfig = testWebpackConfig.getWebpackConfig(skyPagesConfig);

  // Import shared karma config
  testKarmaConf(config);

  // First DefinePlugin wins so we want to override the normal src/app/ value in ROOT_DIR
  webpackConfig.plugins.unshift(
    new DefinePlugin({
      'ROOT_DIR': JSON.stringify(srcPath)
    })
  );

  // Adjust the instrument loader src path.
  webpackConfig.module.rules.forEach(rule => {
    if (
      rule.use &&
      Array.isArray(rule.use) &&
      rule.use[0].loader === '@skyux-sdk/istanbul-instrumenter-loader'
    ) {
      rule.include = srcPath;
    }
  });

  // This is needed exclusively for internal runtime unit tests,
  // which is why it's here instead of alias-builder or the shared test.webpack.config.js
  // It's relative from src/app/
  webpackConfig.resolve.alias['@skyux-sdk/builder/runtime'] = runtimePath;

  // Remove sky-style-loader
  delete config.preprocessors['../../utils/spec-styles.js'];
  config.files.pop();

  config.set({
    webpack: webpackConfig,
    coverageIstanbulReporter: {
      dir: path.join(process.cwd(), 'coverage', 'src-app')
    }
  });
}

module.exports = getConfig;
