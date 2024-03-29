/*jshint node: true, jasmine: true */

'use strict';

const styleLoader = require('@skyux/theme/utils/node-js/style-loader');

// A race condition exists in Firefox where tests can begin before styles are loaded.
// This will ensure that styles are loaded before tests run by ensuring the style rule
// for the HTML hidden property defined in sky.scss has been applied.
(function () {
  beforeAll(function () {
    return styleLoader.loadStyles();
  });
}());
