/*jslint node: true */
'use strict';

const logger = require('@blackbaud/skyux-logger');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
const { OutputKeepAlivePlugin } = require('../../plugin/output-keep-alive');
const skyPagesConfigUtil = require('../sky-pages/sky-pages.config');
const aliasBuilder = require('./alias-builder');
const babelLoaderUtil = require('./babel-loader-rule');

function spaPath() {
  return skyPagesConfigUtil.spaPath.apply(skyPagesConfigUtil, arguments);
}

function outPath() {
  return skyPagesConfigUtil.outPath.apply(skyPagesConfigUtil, arguments);
}

function getLogFormat(skyPagesConfig, argv) {
  // eslint-disable-next-line no-prototype-builtins
  if (argv.hasOwnProperty('logFormat')) {
    return argv.logFormat;
  }

  if (skyPagesConfig.runtime.command === 'serve' || argv.serve) {
    return 'compact';
  }

  return 'expanded';
}

/**
 * Called when loaded via require.
 * @name getWebpackConfig
 * @param {SkyPagesConfig} skyPagesConfig
 * @returns {WebpackConfig} webpackConfig
 */
function getWebpackConfig(skyPagesConfig, argv = {}) {
  const resolves = [
    process.cwd(),
    spaPath('node_modules'),
    outPath('node_modules')
  ];

  let alias = aliasBuilder.buildAliasList(skyPagesConfig);

  const outConfigMode = skyPagesConfig && skyPagesConfig.skyux && skyPagesConfig.skyux.mode;
  const logFormat = getLogFormat(skyPagesConfig, argv);

  let appPath;

  switch (outConfigMode) {
    case 'advanced':
      appPath = spaPath('src', 'main.ts');
      break;

    default:
      appPath = outPath('src', 'main-internal.ts');
      break;
  }

  let plugins = [
    // Some properties are required on the root object passed to HtmlWebpackPlugin
    new HtmlWebpackPlugin({
      template: skyPagesConfig.runtime.app.template,
      inject: skyPagesConfig.runtime.app.inject,
      runtime: skyPagesConfig.runtime,
      skyux: skyPagesConfig.skyux
    }),

    new webpack.DefinePlugin({
      'skyPagesConfig': JSON.stringify(skyPagesConfig)
    }),

    new LoaderOptionsPlugin({
      options: {
        context: __dirname,
        skyPagesConfig: skyPagesConfig
      }
    }),

    new ContextReplacementPlugin(
      // The (\\|\/) piece accounts for path separators in *nix and Windows
      /angular(\\|\/)core(\\|\/)@angular/,
      spaPath('src'),
      {}
    ),

    // See: https://github.com/angular/angular/issues/20357#issuecomment-343683491
    new ContextReplacementPlugin(
      /\@angular(\\|\/)core(\\|\/)fesm5/,
      spaPath('src'),
      {}
    ),

    new OutputKeepAlivePlugin({
      enabled: argv['output-keep-alive']
    }),

    new ForkTsCheckerWebpackPlugin(),

    /**
     * Suppressing the "export not found" warning produced when `ts-loader`'s `transpileOnly`
     * option is set to `true`. When TypeScript doesn't do a full type check, it does not have
     * enough information to determine whether an imported name is a type or not, so when the name
     * is then exported, TypeScript has no choice but to emit the export.
     * See: https://github.com/TypeStrong/ts-loader#transpileonly
     * Using a plugin to suppress the warning since `stats.warningsFilter` is not recognized
     * by `karma-webpack`.
     * See: https://www.npmjs.com/package/webpack-filter-warnings-plugin#why-not-use-the-built-in-statswarningsfilter-option
     */
    new FilterWarningsPlugin({
      exclude: /export .* was not found in/
    })
  ];

  // Supporting a custom logging type of none
  if (logFormat !== 'none') {
    plugins.push(new SimpleProgressWebpackPlugin({
      format: logFormat,
      color: logger.logColor
    }));
  }

  return {
    entry: {
      polyfills: [outPath('src', 'polyfills.ts')],
      app: [appPath]
    },
    output: {
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].chunk.js',
      path: spaPath('dist')
    },
    resolveLoader: {
      modules: resolves
    },
    resolve: {
      alias: alias,
      modules: resolves,
      extensions: [
        '.js',
        '.ts'
      ]
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: [
            /\.(html|s?css)$/,
            /sky-pages\.module\.ts/
          ],
          loader: outPath('loader', 'sky-assets')
        },
        {
          enforce: 'pre',
          test: /sky-pages\.module\.ts$/,
          loader: outPath('loader', 'sky-pages-module')
        },
        {
          enforce: 'pre',
          loader: outPath('loader', 'sky-processor', 'preload'),
          include: [
            spaPath('src'),
            outPath('runtime')
          ]
        },

        babelLoaderUtil.getES5Rule(skyPagesConfig.skyux.dependenciesForTranspilation),

        {
          test: /\.s?css$/,
          use: [
            'raw-loader',
            {
              loader: 'sass-loader',
              options: {
                // Prefer dart sass.
                implementation: require('sass')
              }
            }
          ]
        },
        {
          test: /\.html$/,
          loader: 'raw-loader'
        },
        {
          // Mark files inside `@angular/core` as using SystemJS style dynamic imports.
          // Removing this will cause deprecation warnings to appear.
          // See: https://github.com/angular/angular/issues/21560#issuecomment-433601967
          test: /[\/\\]@angular[\/\\]core[\/\\].+\.js$/,
          parser: {
            system: true
          }
        }
      ]
    },
    plugins,
    optimization: {
      moduleIds: 'hashed',
      noEmitOnErrors: true,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: -3 // zero is default
          },
          polyfill: {
            test: /[\\/]node_modules[\\/](core-js|zone\.js)[\\/]/,
            name: 'pollyfill', // Chunk names cannot match an entry point.
            priority: -2
          },
          skyux: {
            test: /[\\/]node_modules[\\/]@skyux[\\/]/,
            name: 'skyux',
            priority: -1
          }
        }
      }
    },

    /**
     * Angular 7 animations module has an internal check to determine if the environment is
     * using Node. If it is, it manually removes the `String.matches` polyfill to avoid
     * conflicts with Node's native matches function. Angular CLI automatically handles this
     * behavior, but we need to manually unset Node's `process` property since we're using a custom
     * webpack config (Angular checks if `process` exists on the global object to determine
     * if the environment is running in Node).
     * See: https://github.com/angular/angular/issues/24769#issuecomment-405498008
     */
    node: {
      process: false
    }
  };
}

module.exports = {
  getWebpackConfig: getWebpackConfig
};
