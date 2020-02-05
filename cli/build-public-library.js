/*jshint node: true*/
'use strict';

const fs = require('fs-extra');
const ngPackage = require('ng-packagr');
const rimraf = require('rimraf');
const logger = require('@blackbaud/skyux-logger');

const stageTypeScriptFiles = require('./utils/stage-library-ts');
const preparePackage = require('./utils/prepare-library-package');
const skyPagesConfigUtil = require('../config/sky-pages/sky-pages.config');
const tsLinter = require('./utils/ts-linter');

function runLinter(argv) {
  const lintResult = tsLinter.lintSync(argv);
  if (lintResult.exitCode > 0) {
    process.exit(lintResult.exitCode);
  }
}

function cleanTemp() {
  rimraf.sync(skyPagesConfigUtil.spaPathTemp());
}

function cleanDist() {
  rimraf.sync(skyPagesConfigUtil.spaPath('dist'));
}

function cleanAll() {
  cleanTemp();
  cleanDist();
}

function copyDist() {
  fs.copySync(
    skyPagesConfigUtil.spaPathTemp('dist'),
    skyPagesConfigUtil.spaPath('dist')
  );

}

function copyRuntime() {
  fs.copySync(
    skyPagesConfigUtil.outPath('runtime'),
    skyPagesConfigUtil.spaPathTemp('runtime')
  );
}

function cleanRuntime() {
  rimraf.sync(skyPagesConfigUtil.spaPath('dist', 'runtime'));
}

function writeTSConfig() {
  const config = {
    extends: skyPagesConfigUtil.spaPath(
      'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json'
    ),
    angularCompilerOptions: {
      fullTemplateTypeCheck: false,
    }
  };

  fs.writeJSONSync(skyPagesConfigUtil.spaPathTemp('tsconfig.json'), config);
}

function processFiles(skyPagesConfig) {
  const pluginFileProcessor = require('../lib/plugin-file-processor');
  pluginFileProcessor.processFiles(
    skyPagesConfig,
    skyPagesConfigUtil.spaPathTemp('**', '*.*')
  );
}

/**
 * Transpiles TypeScript files into JavaScript files
 * to be included with the NPM package.
 */
function transpile() {
  const projectConfigPath = skyPagesConfigUtil.spaPathTemp('ng-package.json');
  const tsConfigPath = skyPagesConfigUtil.spaPathTemp('tsconfig.json');

  return ngPackage.ngPackagr()
    .forProject(projectConfigPath)
    .withTsConfig(tsConfigPath)
    .build();
}

function writePackagerConfig() {
  const ngPackageConfig = {
    lib: {
      entryFile: 'index.ts'
    }
  };

  fs.writeJsonSync(skyPagesConfigUtil.spaPathTemp('ng-package.json'), ngPackageConfig);
}

module.exports = (argv, skyPagesConfig, webpack) => {
  runLinter(argv);
  cleanAll();
  stageTypeScriptFiles();
  writeTSConfig();
  writePackagerConfig();
  copyRuntime();
  processFiles(skyPagesConfig);

  return transpile()
    .then(() => {
      cleanRuntime();
      copyDist();
      preparePackage();
      cleanTemp();
      logger.info('SKY UX library built successfully.');
      process.exit(0);
    })
    .catch((err) => {
      cleanAll();
      logger.error(err);
      process.exit(1);
    });
};
