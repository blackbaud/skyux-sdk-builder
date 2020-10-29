/*jslint node: true */
'use strict';

const path = require('path');
const DefinePlugin = require('webpack/lib/DefinePlugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const skyPagesConfigUtil = require('../sky-pages/sky-pages.config');
const aliasBuilder = require('./alias-builder');
const babelLoaderUtil = require('./babel-loader-rule');
const tsLoaderUtil = require('./ts-loader-rule');

function spaPath() {
  return skyPagesConfigUtil.spaPath.apply(skyPagesConfigUtil, arguments);
}

function outPath() {
  return skyPagesConfigUtil.outPath.apply(skyPagesConfigUtil, arguments);
}

function getWebpackConfig(skyPagesConfig, argv) {
  const ENV = process.env.ENV = process.env.NODE_ENV = 'test';
  const argvCoverage = (argv) ? argv.coverage : true;
  const runCoverage = (argvCoverage !== false);

  let srcPath;
  if (argvCoverage === 'library') {
    srcPath = path.resolve(process.cwd(), 'src', 'app', 'public');
  } else {
    srcPath = path.resolve(process.cwd(), 'src', 'app');
  }

  const resolves = [
    process.cwd(),
    spaPath('node_modules'),
    outPath('node_modules')
  ];

  skyPagesConfig.runtime.includeRouteModule = false;

  let alias = aliasBuilder.buildAliasList(skyPagesConfig);

  let config = {
    mode: 'development',

    devtool: 'inline-source-map',

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
          test: /runtime\/config\.ts$/,
          loader: outPath('loader', 'sky-app-config')
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
        {
          enforce: 'pre',
          test: /skyux-i18n-testing\.js$/,
          loader: outPath('loader', 'sky-fix-require-context')
        },

        tsLoaderUtil.getRule(),
        babelLoaderUtil.getES5Rule(skyPagesConfig.skyux.incompatibleDependencies),

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

    plugins: [
      new LoaderOptionsPlugin({
        debug: true,
        options: {
          context: __dirname,
          skyPagesConfig: skyPagesConfig
        }
      }),

      new DefinePlugin({
        'ENV': JSON.stringify(ENV),
        'HMR': false,
        'process.env': {
          'ENV': JSON.stringify(ENV),
          'NODE_ENV': JSON.stringify(ENV),
          'HMR': false
        },
        'ROOT_DIR': JSON.stringify(srcPath),
        'skyPagesConfig': JSON.stringify(skyPagesConfig)
      }),

      new ContextReplacementPlugin(
        // The (\\|\/) piece accounts for path separators in *nix and Windows
        /angular(\\|\/)core(\\|\/)@angular/,
        skyPagesConfigUtil.spaPath('src'),
        {}
      ),

      // Suppress the "request of a dependency is an expression" warnings.
      // See: https://github.com/angular/angular/issues/20357#issuecomment-343683491
      new ContextReplacementPlugin(
        /\@angular(\\|\/)core(\\|\/)fesm5/,
        spaPath('src'),
        {}
      ),

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
    ],

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

  if (runCoverage) {
    config.module.rules.push({
      enforce: 'post',
      test: /\.(js|ts)$/,
      use: [
        {
          loader: '@skyux-sdk/istanbul-instrumenter-loader',
          options: {
            esModules: true
          }
        }
      ],
      include: srcPath,
      exclude: [
        /\.(e2e-|pact-)?spec\.ts$/,
        /(\\|\/)node_modules(\\|\/)/,
        /(\\|\/)index\.ts/,
        /(\\|\/)fixtures(\\|\/)/,
        /(\\|\/)testing(\\|\/)/,
        /(\\|\/)src(\\|\/)app(\\|\/)lib(\\|\/)/
      ]
    });
  }

  return config;
}

module.exports = {
  getWebpackConfig: getWebpackConfig
};
