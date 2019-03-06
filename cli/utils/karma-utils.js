const logger = require('@blackbaud/skyux-logger');
const Server = require('karma').Server;
const path = require('path');
const glob = require('glob');
const tsLinter = require('./ts-linter');
const configResolver = require('./config-resolver');
const localeAssetsProcessor = require('../../lib/locale-assets-processor');
const karmaConfigUtil = require('karma').config;

function run(command, argv, specsPattern) {

  const karmaConfigPath = configResolver.resolve(command, argv);
  const karmaConfig = karmaConfigUtil.parseConfig(karmaConfigPath);
  const specsPath = path.resolve(process.cwd(), specsPattern);
  const specsGlob = glob.sync(specsPath);

  let tsLinterLastExitCode = 0;
  let tsLinterQueue = [];

  return new Promise(resolve => {

    // Short-circuit running Karma if there are no spec files
    if (specsGlob.length === 0) {
      logger.info(`No spec files located. Skipping ${command} command.`);
      return resolve(0);
    }

    const server = new Server(karmaConfig, exitCode => {
      if (exitCode === 0 && tsLinterLastExitCode !== 0) {
        exitCode = tsLinterLastExitCode;
      }

      logger.info(`Karma has exited with ${exitCode}.`);
      resolve(exitCode);
    });

    server.on('run_start', () => {
      localeAssetsProcessor.prepareLocaleFiles();
    });

    server.on('browser_error', () => {
      logger.warn('Experienced a browser disconnect error.  Karma will retry up to 3 times.');
    });

    // Add extra handlers to run tslint asynchronously
    if (command === 'watch') {
      server.on('run_start', () => {
        tsLinterQueue.push(tsLinter.lintAsync(argv));
      });

      // Used to display messages after coverage reporter
      server.on('run_complete', () => setTimeout(() => {
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
      }, 10));

      server.on('browser_error', () => {
        logger.warn('You may be interested in using the `--no-lint` flag or refactoring your SPA.');
        tsLinterQueue.shift();
      });
    }

    server.start();
  });
}

module.exports = {
  run
};
