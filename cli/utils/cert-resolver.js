/*jslint node: true */
'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const logger = require('@blackbaud/skyux-logger');

function getResolver() {
  const certRootPath = path.resolve(`${os.homedir()}/.skyux/certs/`);

  if (!fs.pathExistsSync(certRootPath)) {
    logger.error('Unable to locate certificates.');
    logger.error('Please install the latest SKY UX CLI and run `skyux certs install`.');
  } else {
    const resolver = require(certRootPath);
    return resolver;
  }
}

function readCert() {
  const resolver = getResolver();
  if (resolver) {
    return resolver.readCert();
  }
}

function readKey() {
  const resolver = getResolver();
  if (resolver) {
    return resolver.readKey();
  }
}

module.exports = {
  readCert,
  readKey
};
