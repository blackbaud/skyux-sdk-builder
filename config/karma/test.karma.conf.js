/*jshint node: true*/
'use strict';

/**
 * Requires the shared karma config and sets any local properties.
 * @name getConfig
 * @param {Object} config
 */
function getConfig(config) {
  require('./shared.karma.conf')(config);

  let configuration = {
    customLaunchers: {
      SimpleChrome: {
        base: 'Chrome',
        flags: [
          '--ignore-certificate-errors',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-gpu',
          '--hide-scrollbars'
        ]
      }
    }
  };

  configuration.browsers = ['SimpleChrome'];

  config.set(configuration);
}

module.exports = getConfig;
