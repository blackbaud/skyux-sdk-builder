/*jslint node: true */
'use strict';

const fs = require('fs-extra');
const logger = require('@blackbaud/skyux-logger');

function error(prop, code) {
  logger.error(`Unable to resolve certificate property ${prop} (code ${code}).`);
  logger.error('Please install the latest SKY UX CLI and run `skyux certs trust`.');
}

function read(argv, prop) {
  if (!argv[prop]) {
    error(prop, 0);
  } else if (!fs.pathExistsSync(argv[prop])) {
    error(prop, 1);
  } else {
    return fs.readFileSync(argv[prop]);
  }
}

function readCert(argv) {
  return read(argv, 'sslCert');
}

function readKey(argv) {
  return read(argv, 'sslKey');
}

module.exports = {
  readCert,
  readKey
};
