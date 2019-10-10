/*jslint node: true */
'use strict';

const fs = require('fs-extra');
const logger = require('@blackbaud/skyux-logger');

function logError(code) {
  logger.error(`Unable to locate certificates. (${code})`);
  logger.error('Please install the latest SKY UX CLI and run `skyux certs install`.');
}

function getResolver(argv) {
  if (!argv.sslRoot) {
    return logError(0);
  }

  if (!fs.pathExistsSync(argv.sslRoot)) {
    return logError(1);
  }

  const resolver = require(argv.sslRoot);
  logger.info(`Located cert-resolver at ${argv.sslRoot}.`);
  return resolver;
}

module.exports = {
  getResolver
};
