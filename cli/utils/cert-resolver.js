/*jslint node: true */
'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const logger = require('@blackbaud/skyux-logger');

function logError(code) {
  logger.error(`Unable to locate certificates. (${code})`);
  logger.error('Please install the latest SKY UX CLI and run `skyux certs install`.');
}

function getResolver(argv) {
  if (!argv.sslRoot) {
    return logError(0);
  } else if (!fs.pathExistsSync(argv.sslRoot)) {
    return logError(1);
  } else {
    const resolver = require(certRootPath);
    return resolver;
  }
}

function readCert(argv) {
  const resolver = getResolver(argv);
  if (resolver) {
    return resolver.readCert();
  }
}

function readKey(argv) {
  const resolver = getResolver(argv);
  if (resolver) {
    return resolver.readKey();
  }
}

module.exports = {
  readCert,
  readKey
};
