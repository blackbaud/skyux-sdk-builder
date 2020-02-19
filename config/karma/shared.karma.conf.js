/*jslint node: true */
'use strict';

const logger = require('@blackbaud/skyux-logger');

/**
 * Adds the necessary configuration for code coverage thresholds.
 * @param {*} config
 */
function getCoverageThreshold(skyPagesConfig) {
  switch (skyPagesConfig.skyux.codeCoverageThreshold) {
    default:
    case 'none':
      return 0;

    case 'standard':
      return 80;

    case 'strict':
      return 100;
  }
}

/**
 * Common Karma configuration shared between local / CI testing.
 * @name getConfig
 */
function getConfig(config) {

  // This file is spawned so we'll need to read the args again
  const minimist = require('minimist');
  const argv = minimist(process.argv.slice(2));
  const path = require('path');
  const srcPath = path.join(process.cwd(), 'src');

  const testWebpackConfig = require('../webpack/test.webpack.config');

  // See minimist documentation regarding `argv._` https://github.com/substack/minimist
  const skyPagesConfig = require('../sky-pages/sky-pages.config').getSkyPagesConfig(argv._[0]);

  // Using __dirname so this file can be extended from other configuration file locations
  const specBundle = `${__dirname}/../../utils/spec-bundle.js`;
  const specStyles = `${__dirname}/../../utils/spec-styles.js`;
  const polyfillsBundle = `${__dirname}/../../src/polyfills.ts`;

  // Used in conjunction with `proxies` property to remove 404 and correctly serve assets
  const assetsPattern = `${srcPath}/assets/**`;

  const preprocessors = {};

  preprocessors[polyfillsBundle] = ['webpack'];
  preprocessors[specBundle] = ['webpack', 'sourcemap'];
  preprocessors[specStyles] = ['webpack'];

  const codeCoverageThresholdPercent = getCoverageThreshold(skyPagesConfig);

  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    exclude: [],
    files: [
      {
        pattern: polyfillsBundle,
        watched: false
      },
      {
        pattern: specBundle,
        watched: false
      },
      {
        pattern: specStyles,
        watched: false
      },
      {
        pattern: assetsPattern,
        included: false,
        served: true,
      }
    ],
    proxies: {
      '/~/': `/absolute/${srcPath}`
    },
    preprocessors: preprocessors,
    skyPagesConfig: skyPagesConfig,
    webpack: testWebpackConfig.getWebpackConfig(skyPagesConfig, argv),
    coverageIstanbulReporter: {
      combineBrowserReports: true,
      fixWebpackSourcePaths: true,
      skipFilesWithNoCoverage: true,
      dir: path.join(process.cwd(), 'coverage'),
      reports: [
        'html',
        'json',
        'lcov',
        'text-summary'
      ],
      thresholds: {
        global: {
          statements: codeCoverageThresholdPercent,
          lines: codeCoverageThresholdPercent,
          branches: codeCoverageThresholdPercent,
          functions: codeCoverageThresholdPercent
        }
      }
    },
    webpackServer: {
      noInfo: true,
      stats: 'minimal'
    },

    // This is necessary to stop endless test runs for skyux watch.
    // Without it, the coverage reports and .skypageslocales files will
    //  trigger the `invalid` event, causing karma to constantly re-rerun
    //  the tests.  This is a by-product of using `require.context`.
    // https://github.com/webpack-contrib/karma-webpack/issues/253#issuecomment-335545430
    // By using require.context in our @skyux/i18n library ALL project files are watched by default.
    // The function below ignores all files execpt the `src` directory.
    webpackMiddleware: {
      watchOptions: {
        // Returning `true` means the file should be ignored.
        // Fat-Arrow functions do not work as chokidar will inspect this method.
        ignored: function (item) {
          const resolvedPath = path.resolve(item);
          const ignore = (resolvedPath.indexOf(srcPath) === -1);
          return ignore;
        }
      }
    },

    // This flag allows console.log calls to come through the cli
    browserConsoleLogOptions: {
      level: 'log'
    },
    reporters: ['mocha', 'coverage-istanbul'],
    port: 9876,
    colors: logger.logColor,
    logLevel: config.LOG_INFO,
    browserDisconnectTimeout: 3e5,
    browserDisconnectTolerance: 3,
    browserNoActivityTimeout: 3e5,
    captureTimeout: 3e5,
    autoWatch: false,
    singleRun: true,
    failOnEmptyTestSuite: false
  });
}

module.exports = getConfig;
