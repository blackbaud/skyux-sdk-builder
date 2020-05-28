/*jslint node: true */
'use strict';

const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const selenium = require('selenium-standalone');
const protractorLauncher = require('protractor/built/launcher');
const logger = require('@blackbaud/skyux-logger');
const assetsProcessor = require('../lib/assets-processor');
const localeAssetsProcessor = require('../lib/locale-assets-processor');

const build = require('./utils/run-build');
const server = require('./utils/server');
const configResolver = require('./utils/config-resolver');
const chromeDriverManager = require('./utils/chromedriver-manager');
const getPort = require('./serve').getPort;

let seleniumServer;
let start;

/**
 * Handles killing off the selenium and webpack servers.
 * @name killServers
 */
function killServers(exitCode) {
  logger.info('Cleaning up running servers');

  if (seleniumServer) {
    logger.info('Closing selenium server');
    seleniumServer.kill();
    seleniumServer = null;
  }

  server.stop();
  logger.info(`Execution Time: ${(new Date().getTime() - start) / 1000} seconds`);
  logger.info(`Exiting process with ${exitCode}`);
  process.exit(exitCode || 0);
}

/**
 * Spawns the protractor command.
 * Perhaps this should be API driven?
 * @name spawnProtractor
 */
function spawnProtractor(configPath, chunks, port, skyPagesConfig) {
  logger.info('Running Protractor');
  protractorLauncher.init(configPath, {
    params: {
      localUrl: `https://localhost:${port}`,
      chunks: chunks,
      skyPagesConfig: skyPagesConfig
    }
  });
  process.on('exit', killServers);
}

/**
 * Spawns the selenium server if directConnect is not enabled.
 * @name spawnSelenium
 */
function spawnSelenium(configPath) {

  const config = require(configPath).config;

  return new Promise((resolve, reject) => {
    logger.info('Spawning selenium...');

    // Assumes we're running selenium ourselves, so we should prep it
    if (config.seleniumAddress) {
      logger.info('Installing Selenium...');
      selenium.install({ logger: logger.info }, () => {
        logger.info('Selenium installed. Starting...');
        selenium.start((err, child) => {
          if (err) {
            reject(err);
            return;
          }

          seleniumServer = child;
          logger.info('Selenium server is ready.');
          resolve();
        });
      });

      // Otherwise we need to prep protractor's selenium
    } else {
      chromeDriverManager.update()
        .then(() => resolve())
        .catch(err => reject(err));
    }
  });
}

/**
 * Spawns the build process.  Captures the config used.
 */
function spawnBuild(argv, skyPagesConfig, webpack) {

  if (argv.build === false) {
    logger.info('Skipping build step');

    const file = 'dist/metadata.json';
    if (!fs.existsSync(file)) {
      logger.info(`Unable to skip build step.  "${file}" not found.`);
    } else {
      return Promise.resolve({
        metadata: fs.readJsonSync(file)
      });
    }
  }

  return build(argv, skyPagesConfig, webpack)
    .then(stats => stats.toJson().chunks);
}

function runProtractor(command, argv, skyPagesConfig, webpack) {
  start = new Date().getTime();
  process.on('SIGINT', killServers);

  const specsPath = path.resolve(process.cwd(), 'e2e/**/*.e2e-spec.ts');
  const specsGlob = glob.sync(specsPath);
  const configPath = configResolver.resolve(command, argv);

  if (specsGlob.length === 0) {
    logger.info('No spec files located. Skipping e2e command.');
    return killServers(0);
  }

  server.start(argv)
    .then((port) => {
      argv.assets = 'https://localhost:' + port;

      // The assets URL is built by combining the assets URL above with
      // the app's root directory, but in e2e tests the assets files
      // are served directly from the root.  This will back up a directory
      // so that asset URLs are built relative to the root rather than
      // the app's root directory.
      argv.assetsrel = '../';

      return Promise
        .all([
          spawnBuild(argv, skyPagesConfig, webpack),
          port,
          spawnSelenium(configPath)
        ]);
    })
    .then(([chunks, port]) => {
      spawnProtractor(
        configPath,
        chunks,
        port,
        skyPagesConfig
      );
    })
    .catch(err => {
      logger.error(err);
      killServers(1);
    });
}

function runCypressTest(command, argv, skyPagesConfig, webpack, WebpackDevServer) {
  const webpackConfig = require('../config/webpack/cypress.webpack.config');
  let config = webpackConfig.getWebpackConfig(argv, skyPagesConfig);

  getPort(config, skyPagesConfig).then(port => {
    const localUrl = `https://localhost:${port}`;

    assetsProcessor.setSkyAssetsLoaderUrl(config, skyPagesConfig, localUrl);
    localeAssetsProcessor.prepareLocaleFiles();

    // Save our found or defined port
    config.devServer.port = port;

    /* istanbul ignore else */
    if (config.devServer.inline) {
      const inline = `webpack-dev-server/client?${localUrl}`;
      Object.keys(config.entry).forEach((entry) => {
        config.entry[entry].unshift(inline);
      });
    }

    if (config.devServer.hot) {
      const hot = `webpack/hot/only-dev-server`;
      Object.keys(config.entry).forEach((entry) => {
        config.entry[entry].unshift(hot);
      });

      // This is required in order to not have HMR requests routed to host.
      config.output.publicPath = `${localUrl}${config.devServer.publicPath}`;
      logger.info('Using hot module replacement.');
    }

    const compiler = webpack(config);
    const server = new WebpackDevServer(compiler, config.devServer);
    server.listen(config.devServer.port, 'localhost', (err) => {
      if (err) {
        logger.error(err);
      }
    });
  }).catch(err => logger.error(err));
}

/**
 * Spawns the necessary commands for e2e.
 * Assumes build was ran.
 * @name e2e
 */
function e2e(command, argv, skyPagesConfig, webpack, WebpackDevServer) {
  if (argv._[1] === 'cypress') {
    runCypressTest(command, argv, skyPagesConfig, webpack, WebpackDevServer);
  } else
    runProtractor(command, argv, skyPagesConfig, webpack);
}

module.exports = e2e;
