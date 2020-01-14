/*jshint node: true*/
'use strict';

const minimist = require('minimist');

/**
 * Requires the shared karma config and sets any local properties.
 * @name getConfig
 * @param {Object} config
 */
function getConfig(config) {
  require('./shared.karma.conf')(config);

  const argv = minimist(process.argv.slice(2), {
    boolean: ['headless', 'enableDesktopNotifications', 'suppressUnfocusedTestOutput']
  });
  const browser = (argv.headless) ? 'ChromeHeadless' : 'Chrome';

  const configuration = {
    browsers: [
      browser
    ],
    customLaunchers: {
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    }
  };

  if (process.env.TRAVIS) {
    configuration.browsers = ['Chrome_travis_ci'];
  }

  if (argv.suppressUnfocusedTestOutput) {
    configuration.mochaReporter = { ignoreSkipped: true };
  }

  if (argv.enableDesktopNotifications) {
    configuration.reporters = config.reporters ? config.reporters.concat('notify') : ['notify'];
  }

  config.set(configuration);
}

module.exports = getConfig;
