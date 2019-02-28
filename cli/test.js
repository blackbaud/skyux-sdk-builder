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
  const configResolver = require('./utils/config-resolver');
  const localeAssetsProcessor = require('../lib/locale-assets-processor');

  argv = argv || process.argv;
  argv.command = command;

  const karmaConfigUtil = require('karma').config;
  const karmaConfigPath = configResolver.resolve(command, argv);
  const karmaConfig = karmaConfigUtil.parseConfig(karmaConfigPath);
  const specsPath = path.resolve(process.cwd(), 'src/app/**/*.spec.ts');
  const specsGlob = glob.sync(specsPath);

  const onExit = (exitCode) => {
    logger.info(`Karma has exited with ${exitCode}.`);
    process.exit(exitCode);
  };

  if (specsGlob.length === 0) {
    logger.info('No spec files located. Skipping test command.');
    return onExit(0);
  }

  localeAssetsProcessor.prepareLocaleFiles();

  const server = new Server(karmaConfig, onExit);
  server.start();
}

module.exports = test;
