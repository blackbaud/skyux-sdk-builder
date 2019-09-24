/*jslint node: true */
'use strict';

const os = require('os');
const path = require('path');

// PATH SHARED WITH CLI
const resolver = require(path.resolve(`${os.homedir()}/.skyux/certs/`));

function readCert() {
  return resolver.readCert();
}

function readKey() {
  return resolver.readKey();
}

module.exports = {
  readCert,
  readKey
};
