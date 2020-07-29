const logger = require('@blackbaud/skyux-logger');
const Server = require('karma').Server;
const karmaConfigUtil = require('karma').config;
const karmaLogger = require('karma/lib/logger');
const path = require('path');
const glob = require('glob');
const tsLinter = require('./ts-linter');
const configResolver = require('./config-resolver');
const localeAssetsProcessor = require('../../lib/locale-assets-processor');

function run(command, argv, specsPattern) {

  // Karma calls this when the config class is internally instantiated.
  // We must call it manually before calling parseConfig.  If not,
  // the logLevel will default to LOG_DISABLED, meaning no parsing errors are shown.
  // This method interally sets it to LOG_INFO.
  karmaLogger.setupFromConfig({});

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

    server.on('browser_error', (browser, error) => {
      logger.warn(`[SKY UX Builder] Karma encountered a browser error: ${error.message}`);
      console.log('Karma error:', error);
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

    server.start(argv);
  });
}

module.exports = {
  run
};
