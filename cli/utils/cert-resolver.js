/*jslint node: true */
'use strict';

const fs = require('fs-extra');
const logger = require('@blackbaud/skyux-logger');

function read(argv, prop) {
  if (argv[prop] && fs.pathExistsSync(argv[prop])) {
    return fs.readFileSync(argv[prop]);
  }

  logger.error(`Unable to resolve certificate property ${prop}.`);
  logger.error('Please install the latest SKY UX CLI and run `skyux certs trust`.');
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
