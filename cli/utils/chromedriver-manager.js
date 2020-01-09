/*jslint node: true */
'use strict';

const path = require('path');
const spawn = require('cross-spawn');
const logger = require('@blackbaud/skyux-logger');
const matcher = require('chromedriver-version-matcher');

/**
 * Calls the getChromeDriverVersion method in our library.
 * Handles any errors and defaults to 'latest'.
 */
function getVersion() {
  return new Promise(resolve => {
    const defaultVersion = 'latest';

    matcher.getChromeDriverVersion()
      .then(result => {
        if (result.chromeDriverVersion) {
          resolve(result.chromeDriverVersion);
        } else {
          resolve(defaultVersion);
        }
      })
      .catch(() => resolve(defaultVersion));
  });
}

function update() {
  return new Promise((resolve, reject) => {
    getVersion().then(version => {
      logger.info(`Updating webdriver to version ${version}`);

      const webdriverManagerPath = path.resolve(
        'node_modules',
        '.bin',
        'webdriver-manager'
      );

      const results = spawn.sync(
        webdriverManagerPath,
        [
          'update',
          '--standalone',
          'false',
          '--gecko',
          'false',
          '--versions.chrome',
          version
        ],
        {
          stdio: 'inherit'
        }
      );

      if (results.error) {
        reject(results.error);
      } else {
        logger.info('webdriver successfully updated.');
        resolve();
      }
    });
  });
}

module.exports = {
  getVersion,
  update
};
