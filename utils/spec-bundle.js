/*jslint node: true */
/*global ROOT_DIR*/
'use strict';

require('zone.js/dist/zone');
require('zone.js/dist/zone-testing');

const testing = require('@angular/core/testing');
const browser = require('@angular/platform-browser-dynamic/testing');

// First, initialize the Angular testing environment.
testing.getTestBed().initTestEnvironment(
  browser.BrowserDynamicTestingModule,
  browser.platformBrowserDynamicTesting()
);

// Then we find all the tests.
const testContext = require.context(ROOT_DIR, true, /\.spec\.ts/);

// And load the modules.
function requireAll(requireContext) {
  return requireContext.keys().map(requireContext);
}

requireAll(testContext);
