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
  const tsConfig = {
    extends: skyPagesConfigUtil.spaPath(
      'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json'
    ),
    compilerOptions: {
      lib: ['dom', 'es6']
    }
  };

  fs.writeJSONSync(skyPagesConfigUtil.spaPathTemp('tsconfig.lib.json'), tsConfig);
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
  const tsConfigPath = skyPagesConfigUtil.spaPathTemp('tsconfig.lib.json');

  return ngPackage.ngPackagr()
    .forProject(projectConfigPath)
    .withTsConfig(tsConfigPath)
    .build();
}

function writePackagerConfig(skyPagesConfig) {
  const ngPackageConfig = {
    lib: {
      entryFile: 'public_api.ts'
    }
  };

  // Allow consumers to provide a list of whitelisted peer dependencies.
  // See: https://github.com/ng-packagr/ng-packagr/blob/master/docs/dependencies.md#whitelisting-the-dependencies-section
  const whitelist = (
    skyPagesConfig.skyux &&
    skyPagesConfig.skyux.librarySettings &&
    skyPagesConfig.skyux.librarySettings.whitelistedNonPeerDependencies
  ) || [];

  const wildcardIndex = whitelist.indexOf('.');
  if (wildcardIndex > -1) {
    logger.warn(
      'Removing wildcard whitelist entry (`.`). ' +
      'Please enter whitelisted peer dependencies individually.'
    );
    whitelist.splice(wildcardIndex, 1);
  }

  if (whitelist.length > 0) {
    ngPackageConfig.whitelistedNonPeerDependencies = [...whitelist];
  }

  fs.writeJSONSync(skyPagesConfigUtil.spaPathTemp('ng-package.json'), ngPackageConfig);

  createTestingEntryPoint();
}

/**
 * Create a secondary entrypoint for a `testing` module, if it exists.
 */
function createTestingEntryPoint() {
  const testingEntryPoint = skyPagesConfigUtil.spaPathTemp('testing/index.ts');
  if (fs.existsSync(testingEntryPoint)) {
    // Need to create a root-level barrel file so that the `testing` files can locate
    // the primary source files during compilation.
    // See: https://github.com/ng-packagr/ng-packagr/issues/358#issuecomment-526650736
    fs.writeFileSync(
      skyPagesConfigUtil.spaPathTemp('public_api.testing.ts'),
      `export * from './testing';\n`,
      {
        encoding: 'utf8'
      }
    );

    fs.writeJSONSync(skyPagesConfigUtil.spaPathTemp('testing/ng-package.json'), {
      lib: {
        entryFile: '../public_api.testing.ts'
      }
    });
  }
}

module.exports = (argv, skyPagesConfig) => {
  runLinter(argv);
  cleanAll();
  stageSourceFiles();
  writeTSConfig();
  writePackagerConfig(skyPagesConfig);
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
