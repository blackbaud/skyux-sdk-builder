/*jslint node: true */
'use strict';

const spawn = require('cross-spawn');
const logger = require('@blackbaud/skyux-logger');
const skyPagesConfigUtil = require('../../config/sky-pages/sky-pages.config');
const tslintLocation = './node_modules/.bin/tslint';

function getFlags(argv) {
  const flags = [
    '--project',
    skyPagesConfigUtil.spaPath('tsconfig.json'),
    '--config',
    skyPagesConfigUtil.spaPath('tslint.json'),
    '--exclude',
    '**/node_modules/**/*.ts',
    '--format'
  ];

  if (argv.format) {
    flags.push(argv.format);
  } else if (argv.platform === 'vsts') {
    flags.push('vso');
  } else {
    flags.push('stylish');
  }

  if (argv.fix) {
    flags.push('--fix');
  }

  return flags;
}

function getSkipOutput() {
  return 'TSLint skipped.  Manually run `skyux lint` to catch linting errors.';
}

function lintAsync(argv) {

  if (argv.lint === false) {
    return Promise.resolve({
      executionTime: 0,
      exitCode: 0,
      output: getSkipOutput()
    });
  }

  return new Promise((resolve) => {
    let output = '';

    function handleBuffer(buffer) {
      output += buffer.toString();
    }

    const startTime = (new Date()).getTime();
    const tslint = spawn(tslintLocation, getFlags(argv));

    tslint.stderr.on('data', handleBuffer);
    tslint.stdout.on('data', handleBuffer);

    tslint.on('exit', (exitCode) => {
      const endTime = (new Date()).getTime();
      resolve({
        output,
        executionTime: (endTime - startTime),
        exitCode
      });
    });

  });
}

function lintSync(argv) {

  if (argv.lint === false) {
    logger.warn(getSkipOutput());
    return {
      executionTime: 0,
      exitCode: 0,
      output: ''
    };
  }

  logger.info('TSLint started synchronously.');
  const startTime = (new Date()).getTime();
  const tslint = spawn.sync(tslintLocation, getFlags(argv), { stdio: 'inherit' });
  const endTime = (new Date()).getTime();
  const executionTime = endTime - startTime;
  logger.info(`TSLint exited with ${tslint.status} in ${endTime - startTime}ms.`);

  return {
    executionTime,
    exitCode: tslint.status,
    output: tslint.output
  };
}

module.exports = {
  lintAsync,
  lintSync
};
