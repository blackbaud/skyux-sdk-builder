/*jslint node: true */
'use strict';

function lint(argv) {
  const tsLinter = require('./utils/ts-linter');
  const result = tsLinter.lintSync(argv);

  process.exit(result.exitCode);
}

module.exports = lint;
