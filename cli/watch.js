/*jslint node: true */
'use strict';

const karmaUtils = require('./utils/karma-utils');

/**
 * Spawns the karma test command.
 * @name test
 */
function test(command, argv) {

  argv = argv || process.argv;
  argv.command = command;

  // tslint is run asynchronously in the context of Karma
  karmaUtils.run(command, argv, 'src/app/**/*.spec.ts')
    .then(exitCode => process.exit(exitCode));
}

module.exports = test;
