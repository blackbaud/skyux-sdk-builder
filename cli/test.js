/*jslint node: true */
'use strict';

/**
 * Spawns the karma test command.
 * @name test
 */
function test(command, argv) {
  const logger = require('@blackbaud/skyux-logger');
  const Server = require('karma').Server;
  const path = require('path');
  const glob = require('glob');
  const tsLinter = require('./utils/ts-linter');
  const configResolver = require('./utils/config-resolver');
  const localeAssetsProcessor = require('../lib/locale-assets-processor');

  argv = argv || process.argv;
  argv.command = command;

  const karmaConfigUtil = require('karma').config;
  const karmaConfigPath = configResolver.resolve(command, argv);
  const karmaConfig = karmaConfigUtil.parseConfig(karmaConfigPath);
  const specsPath = path.resolve(process.cwd(), 'src/app/**/*.spec.ts');
  const specsGlob = glob.sync(specsPath);

  let tsLinterLastExitCode = 0;
  let tsLinterQueue = [];

  const onRunStart = () => {
    tsLinterQueue.push(tsLinter.lintAsync(argv));
    localeAssetsProcessor.prepareLocaleFiles();
  };

  // Escape as soon as possible to minimize disconnects.
  const onRunComplete = () => {

    // Used to display messages after coverage reporter
    setTimeout(() => {

      logger.info(`TSLint started asynchronously from ${command} command.`);
      const tsLinterInstance = tsLinterQueue.shift();

      // Could have already been removed if there was a browser error
      if (!tsLinterInstance) {
        logger.verbose(`TSLint instance invalid.  Ignoring results.`);
      } else {
        tsLinterInstance.then(result => {
          if (tsLinterQueue.length > 0) {
            logger.verbose(`TSLint completed in ${result.executionTime}ms.`);
            logger.verbose(`Message hidden.  Queue length: ${tsLinterQueue.length}`);
          } else {
            tsLinterLastExitCode = result.exitCode;
            logger.error(result.output);
            logger.info(`TSLint completed in ${result.executionTime}ms.`);
          }
        });
      }

    }, 10);
  };

  const onExit = (exitCode) => {
    if (exitCode === 0 && tsLinterLastExitCode !== 0) {
      exitCode = tsLinterLastExitCode;
    }

    logger.info(`Karma has exited with ${exitCode}.`);
    process.exit(exitCode);
  };

  const onBrowserError = () => {
    tsLinterQueue.shift();
    logger.warn('Experienced a browser error, but letting karma retry.');
  };

  if (specsGlob.length === 0) {
    logger.info('No spec files located. Skipping test command.');
    return onExit(0);
  }

  const server = new Server(karmaConfig, onExit);
  server.on('run_start', onRunStart);
  server.on('run_complete', onRunComplete);
  server.on('browser_error', onBrowserError);
  server.start();
}

module.exports = test;
