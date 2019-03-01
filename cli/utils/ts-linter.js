/*jslint node: true */
'use strict';

const logger = require('@blackbaud/skyux-logger');
const tslint = require('tslint');
const skyPagesConfigUtil = require('../../config/sky-pages/sky-pages.config');

const { Configuration, Linter, Formatters } = tslint;
const lintJson = skyPagesConfigUtil.spaPath('tslint.json');
const configJson = skyPagesConfigUtil.spaPath('tsconfig.json');

function plural(word, arr) {
  const suffix = arr.length === 1 ? '' : 's';
  return `${arr.length} ${word}${suffix}`;
}

function lintSync() {
  const options = {
    fix: false,
    formatter: Formatters.StylishFormatter
  };
  const program = Linter.createProgram(configJson, skyPagesConfigUtil.spaPath());
  const instance = new Linter(options, program);

  let errors = [];
  let errorOutput = '';
  let exitCode = 0;

  try {
    const files = Linter.getFileNames(program);
    logger.info(`TSLint started. Found ${plural('file', files)}.`);

    files.forEach((file) => {
      logger.verbose(`Linting ${file}.`);
      const contents = program.getSourceFile(file).getFullText();
      const config = Configuration.findConfiguration(lintJson, file).results;
      instance.lint(file, contents, config);
    });

    const result = instance.getResult();
    logger.info(`TSLint finished. Found ${plural('error', result.failures)}.`);

    if (result.errorCount) {
      errors = result.failures;
      errorOutput = '\n' + result.output;
      logger.error(errorOutput);
      exitCode = 1;
    }

  } catch (err) {
    errorOutput = err;
    logger.error(err);
    exitCode = 2;
  }

  return {
    errors,
    errorOutput,
    exitCode
  };
}

module.exports = {
  lintSync
};
