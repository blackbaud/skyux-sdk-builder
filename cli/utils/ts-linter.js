/*jslint node: true */
'use strict';

const logger = require('@blackbaud/skyux-logger');
const tslint = require('tslint');
const skyPagesConfigUtil = require('../../config/sky-pages/sky-pages.config');

const { Configuration, Linter, findFormatter } = tslint;
const lintJson = skyPagesConfigUtil.spaPath('tslint.json');
const configJson = skyPagesConfigUtil.spaPath('tsconfig.json');

function plural(word, arr) {
  const suffix = arr.length === 1 ? '' : 's';
  return `${arr.length} ${word}${suffix}`;
}

function getOptions(argv) {
  const options = {
    formatter: 'stylish'
  };

  if (argv.fix) {
    options.fix = true;
  }

  if (argv.platform === 'vsts') {
    options.formatter = 'vso';
  }

  return options;
}

function lintSync(argv) {
  const options = getOptions(argv);
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

    // Necessary since stylish report doesn't handle fixes
    // This passes in the fixes as if they were errors to the formatter.
    if (result.fixes.length) {
      const Formatter = findFormatter(options.formatter);
      const formatter = new Formatter();

      logger.info(`TSLint fixed ${plural('error', result.fixes)}.\n`);
      logger.info(formatter.format(result.fixes));
    }

    if (result.errorCount) {
      errors = result.failures;
      errorOutput = '\n' + result.output;
      logger.error(errorOutput);
      exitCode = 1;
    }

  } catch (err) {
    console.log(err);
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
