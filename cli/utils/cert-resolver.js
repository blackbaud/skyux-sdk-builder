/*jslint node: true */
'use strict';

const fs = require('fs-extra');
const logger = require('@blackbaud/skyux-logger');

function validate(prop) {
  if (prop && fs.pathExistsSync(prop)) {
    return true;
  }

  logger.error(`Unable to resolve certificate property ${prop}.`);
  logger.error('Please install the latest SKY UX CLI and run `skyux certs trust`.');
}

function readCert(argv) {
  if (validate(argv.sslCert)) {
    return fs.readFileSync(argv.sslCert);
  }
}

function readKey(argv) {
  if (validate(argv.sslKey)) {
    return fs.readFileSync(argv.sslKey);
  }
}

module.exports = {
  readCert,
  readKey
};
