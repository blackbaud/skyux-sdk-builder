/*jslint node: true */
'use strict';

const logger = require('@blackbaud/skyux-logger');
const tslint = require('tslint');
const { Configuration, Linter } = tslint;

const skyPagesConfigUtil = require('../../config/sky-pages/sky-pages.config');

const options = {
  fix: false,
  formatter: tslint.Formatters.StylishFormatter
};

const lintJson = skyPagesConfigUtil.spaPath('tslint.json')
const configJson = skyPagesConfigUtil.spaPath('tsconfig.json');
const program = Linter.createProgram(configJson, '.');
const linter = new Linter(options, program);

function plural(word, arr) {
  return `${ arr.length } ${ word }${ arr.length === 1 ? '' : 's' }`;
}

function lintSync () {
  let errors = [];
  let exitCode = 0;

  try {
    const files = Linter.getFileNames(program);
    logger.info(`TSLint started. Found ${ plural('file', files) }.`);

    files.forEach((file) => {
      logger.verbose(`Linting ${file}.`);
      const contents = program.getSourceFile(file).getFullText();
      const config = Configuration.findConfiguration(lintJson, file).results;
      linter.lint(file, contents, config);
    });

    const result = linter.getResult();
    logger.info(`TSLint finished. Found ${ plural('error', result.failures) }.`);

    if (result.errorCount) {
      errors = result.failures;
      logger.error(`\n${ result.output }`);
      exitCode = 1;
    }

  } catch (err) {
    logger.error(err);
    exitCode = 2;
  }

  return {
    errors: errors,
    exitCode: exitCode
  };
}

module.exports = {
  lintSync
};
