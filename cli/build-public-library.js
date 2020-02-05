/*jshint node: true*/
'use strict';

const fs = require('fs-extra');
const ngPackage = require('ng-packagr');
const rimraf = require('rimraf');

const stageTypeScriptFiles = require('./utils/stage-library-ts');
const preparePackage = require('./utils/prepare-library-package');
const skyPagesConfigUtil = require('../config/sky-pages/sky-pages.config');

const DIST_DIR = skyPagesConfigUtil.spaPath('dist');

const cleanDist = () => rimraf.sync(DIST_DIR);
const cleanTemp = () => rimraf.sync(skyPagesConfigUtil.spaPathTemp());

function cleanAll() {
  cleanTemp();
  cleanDist();
}

function writeTsConfig() {
  const defaultConfigPath = skyPagesConfigUtil.spaPath(
    'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json'
  );

  const tsConfig = {
    extends: defaultConfigPath,
    compilerOptions: {}
  };

  fs.writeJsonSync(
    skyPagesConfigUtil.spaPathTemp('tsconfig.lib.json'),
    tsConfig
  );
}

function createNgPackageJson() {
  const ngPackageConfig = {
    lib: {
      entryFile: 'index.ts'
    }
  };

  fs.writeJsonSync(
    skyPagesConfigUtil.spaPathTemp('ng-package.json'),
    ngPackageConfig
  );
}

function runPackager() {
  const projectConfigPath = skyPagesConfigUtil.spaPathTemp('ng-package.json');
  const tsConfigPath = skyPagesConfigUtil.spaPathTemp('tsconfig.lib.json');

  return ngPackage
    .ngPackagr()
    .forProject(projectConfigPath)
    .withTsConfig(tsConfigPath)
    .build();
}

function finalPolish() {
  preparePackage();

  fs.copySync(
    skyPagesConfigUtil.spaPathTemp('dist'),
    DIST_DIR
  );
}

async function buildPublicLibrary() {
  cleanAll();
  stageTypeScriptFiles();
  writeTsConfig();
  createNgPackageJson();

  try {
    await runPackager();
    finalPolish();
    console.log('Package success.');
  } catch (error) {
    console.log('Package error:', error);
    process.exit(1);
  }
}

module.exports = buildPublicLibrary;
