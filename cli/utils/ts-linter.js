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
    '**/node_modules/**/*.ts'
  ];

  if (argv.fix) {
    flags.push('--fix');
  }

  return flags;
}

function lintAsync(argv, id) {
  let output = '';

  function handleBuffer(buffer) {
    output += buffer.toString();
  }

  return new Promise((resolve) => {
    const startTime = (new Date()).getTime();
    const tslint = spawn(tslintLocation, getFlags(argv));

    tslint.stderr.on('data', handleBuffer);
    tslint.stdout.on('data', handleBuffer);

    tslint.on('exit', (exitCode) => {
      const endTime = (new Date()).getTime();
      resolve({
        id,
        output,
        executionTime: (endTime - startTime),
        exitCode
      });
    });

  });
}

function lintSync(argv) {
  logger.info('TSLint started synchronously.');
  const startTime = (new Date()).getTime();
  const tslint = spawn.sync(tslintLocation, getFlags(argv), { stdio: 'inherit' });
  const endTime = (new Date()).getTime();
  logger.info(`TSLint completed in ${endTime-startTime}ms.`);

  process.exit(tslint.exitCode);
}

module.exports = {
  lintAsync,
  lintSync
};
