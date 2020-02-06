/*jshint node: true*/
'use strict';

const fs = require('fs-extra');
const ngPackage = require('ng-packagr');
const rimraf = require('rimraf');
const logger = require('@blackbaud/skyux-logger');

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

function stageSourceFiles() {
  // Copy everything in the `public` folder.
  fs.copySync(
    skyPagesConfigUtil.spaPath('src/app/public'),
    skyPagesConfigUtil.spaPathTemp()
  );

  // Copy `package.json`.
  fs.copySync(
    skyPagesConfigUtil.spaPath('package.json'),
    skyPagesConfigUtil.spaPathTemp('package.json')
  );

  // Copy specific static files.
  const pathsToCopy = [
    ['README.md'],
    ['CHANGELOG.md'],
    ['src', 'assets']
  ];

  pathsToCopy.forEach(pathArr => {
    const sourcePath = skyPagesConfigUtil.spaPath(...pathArr);
    if (fs.existsSync(sourcePath)) {
      fs.copySync(
        sourcePath,
        skyPagesConfigUtil.spaPath('dist', ...pathArr)
      );
    } else {
      logger.warn(`File(s) not found: ${sourcePath}`);
    }
  });
}

function cleanRuntime() {
  rimraf.sync(skyPagesConfigUtil.spaPath('dist', 'runtime'));
}

function writeTSConfig() {
  const config = {
    extends: skyPagesConfigUtil.spaPath(
      'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json'
    ),
    compilerOptions: {
      lib: ['dom', 'es6']
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

  fs.writeJSONSync(skyPagesConfigUtil.spaPathTemp('ng-package.json'), ngPackageConfig);

  // Create a secondary entrypoint for a testing module, if it exists.
  const testingEntryPoint = skyPagesConfigUtil.spaPathTemp('testing/index.ts');
  if (fs.existsSync(testingEntryPoint)) {
    fs.writeJSONSync(skyPagesConfigUtil.spaPathTemp('testing/ng-package.json'), ngPackageConfig);
  }
}

module.exports = (argv, skyPagesConfig) => {
  runLinter(argv);
  cleanAll();
  stageSourceFiles();
  writeTSConfig();
  writePackagerConfig();
  copyRuntime();
  processFiles(skyPagesConfig);

  return transpile()
    .then(() => {
      cleanRuntime();
      copyDist();
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
