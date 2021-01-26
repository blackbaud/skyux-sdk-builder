/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const rimraf = require('rimraf');
const logger = require('@blackbaud/skyux-logger');

describe('cli build-public-library', () => {
  const requirePath = '../cli/build-public-library';
  let mockFs;
  let mockPluginFileProcessor;
  let mockPackagerBuildResult;
  let mockSkyPagesConfig;

  beforeEach(() => {
    mockFs = {
      writeJSONSync() {},
      readJsonSync() {
        return {
          compilerOptions: {}
        };
      },
      writeFileSync() {},
      copySync() {},
      existsSync() {}
    };

    mockPluginFileProcessor = {
      processFiles: () => {}
    };

    mockPackagerBuildResult = Promise.resolve();

    mockSkyPagesConfig = {
      outPath: (...args) => ['builder', ...args].join('/'),
      spaPath: (...args) => args.join('/'),
      spaPathTemp: (...args) => ['temp', ...args].join('/')
    };

    mock('../cli/utils/ts-linter', {
      lintSync: () => {
        return {
          exitCode: 0
        };
      }
    });

    mock('../lib/plugin-file-processor', mockPluginFileProcessor);

    mock('../config/sky-pages/sky-pages.config', mockSkyPagesConfig);

    mock('fs-extra', mockFs);

    mock('ng-packagr', {
      ngPackagr() {
        return {
          forProject() {
            return {
              withTsConfig() {
                return {
                  build() {
                    return mockPackagerBuildResult;
                  }
                };
              }
            };
          }
        };
      }
    });

    spyOn(logger, 'info').and.callFake(() => {});
    spyOn(logger, 'warn').and.callFake(() => {});
    spyOn(process, 'exit').and.callFake(() => {});
    spyOn(rimraf, 'sync').and.callFake(() => {});
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should return a function', () => {
    const cliCommand = mock.reRequire(requirePath);
    expect(cliCommand).toEqual(jasmine.any(Function));
  });

  it('should copy the runtime folder before compiling, clean it before packaging', async (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockFs, 'copySync').and.callThrough();

    await cliCommand({}, {});

    expect(spy).toHaveBeenCalledWith('builder/runtime', 'temp/runtime');
    expect(rimraf.sync).toHaveBeenCalledTimes(4);

    done();
  });

  it('should clean the dist and temp directories', async (done) => {
    const pathSpy = spyOn(mockSkyPagesConfig, 'spaPath').and.callThrough();
    const pathTempSpy = spyOn(mockSkyPagesConfig, 'spaPathTemp').and.callThrough();
    const cliCommand = mock.reRequire(requirePath);

    await cliCommand({}, {});

    expect(rimraf.sync).toHaveBeenCalledWith('temp');
    expect(rimraf.sync).toHaveBeenCalledWith('dist');
    expect(pathTempSpy).toHaveBeenCalledWith();
    expect(pathSpy).toHaveBeenCalledWith('dist');

    done();
  });

  it('should write a tsconfig.lib.json file using options from the library\'s', async (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    const readSpy = spyOn(mockFs, 'readJsonSync').and.returnValue({
      compilerOptions: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        noImplicitAny: true,
        noImplicitThis: true,
        alwaysStrict: true,
        strictBindCallApply: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        strictPropertyInitialization: true,
        forceConsistentCasingInFileNames: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        // Non-Supported
        foo: 'bar'
      },
      angularCompilerOptions: {
        fullTemplateTypeCheck: true,
        strictTemplates: true,
        strictInputTypes: true,
        strictInputAccessModifiers: true,
        strictNullInputTypes: true,
        strictAttributeTypes: true,
        strictSafeNavigationTypes: true,
        strictDomLocalRefTypes: true,
        strictOutputEventTypes: true,
        strictDomEventTypes: true,
        strictContextGenerics: true,
        strictLiteralTypes: true,
      }
    });

    await cliCommand({}, {});

    expect(readSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('temp/tsconfig.lib.json', {
      extends: 'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json',
      compilerOptions: {
        lib: ['dom', 'es6'],
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        noImplicitAny: true,
        noImplicitThis: true,
        alwaysStrict: true,
        strictBindCallApply: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        strictPropertyInitialization: true,
        forceConsistentCasingInFileNames: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
      },
      angularCompilerOptions: {
        fullTemplateTypeCheck: true,
        strictTemplates: true,
        strictInputTypes: true,
        strictInputAccessModifiers: true,
        strictNullInputTypes: true,
        strictAttributeTypes: true,
        strictSafeNavigationTypes: true,
        strictDomLocalRefTypes: true,
        strictOutputEventTypes: true,
        strictDomEventTypes: true,
        strictContextGenerics: true,
        strictLiteralTypes: true,
      }
    });

    done();
  });

  it('should write a tsconfig.lib.json file even when library does not have one', async (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    const readSpy = spyOn(mockFs, 'readJsonSync').and.returnValue(undefined);

    await cliCommand({}, {});

    expect(readSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('temp/tsconfig.lib.json', {
      extends: 'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json',
      compilerOptions: {
        lib: ['dom', 'es6']
      },
      angularCompilerOptions: {}
    });

    done();
  });

  it('should write a tsconfig.lib.json file even when library does not have compiler options', async (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    const readSpy = spyOn(mockFs, 'readJsonSync').and.returnValue({});

    await cliCommand({}, {});

    expect(readSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('temp/tsconfig.lib.json', {
      extends: 'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json',
      compilerOptions: {
        lib: ['dom', 'es6']
      },
      angularCompilerOptions: {}
    });

    done();
  });

  it('should write a ng-package.json file for the primary entry point', async (done) => {
    const writeSpy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    const cliCommand = mock.reRequire(requirePath);

    await cliCommand({}, {});

    expect(writeSpy).toHaveBeenCalledWith('temp/ng-package.json', {
      lib: {
        entryFile: 'public_api.ts'
      }
    });

    done();
  });

  it('should fail the build if linting errors are found', async (done) => {
    mock.stop('../cli/utils/ts-linter');

    mock('../cli/utils/ts-linter', {
      lintSync: () => {
        return {
          exitCode: 1
        };
      }
    });

    const cliCommand = mock.reRequire(requirePath);

    await cliCommand({}, {});

    expect(process.exit).toHaveBeenCalledWith(1);

    done();
  });

  it('should handle transpilation errors', async (done) => {
    const error = new Error('Packaging error.');

    mockPackagerBuildResult = Promise.reject(error);

    const spy = spyOn(logger, 'error');
    const cliCommand = mock.reRequire(requirePath);

    await cliCommand({}, {});

    expect(spy).toHaveBeenCalledWith(error);

    done();
  });

  it('should process files', async (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockPluginFileProcessor, 'processFiles').and.callThrough();

    await cliCommand({}, {});

    expect(spy).toHaveBeenCalled();

    done();
  });

  it('should include testing entry point if directory exists', async (done) => {
    spyOn(mockFs, 'existsSync').and.returnValue(true);

    const writeJsonSpy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    const pathSpy = spyOn(mockSkyPagesConfig, 'spaPathTemp').and.callThrough();
    const cliCommand = mock.reRequire(requirePath);

    await cliCommand({}, {});

    expect(pathSpy).toHaveBeenCalledWith('testing/public_api.ts');

    expect(writeJsonSpy).toHaveBeenCalledWith('temp/testing/ng-package.json', {
      lib: {
        entryFile: 'public_api.ts'
      }
    });

    done();
  });

  it('should copy readme, changelog, and assets to dist', async (done) => {
    spyOn(mockFs, 'existsSync').and.returnValue(true);

    const copySpy = spyOn(mockFs, 'copySync').and.returnValue();
    const cliCommand = mock.reRequire(requirePath);

    await cliCommand({}, {});

    expect(copySpy).toHaveBeenCalledWith('README.md', 'dist/README.md');
    expect(copySpy).toHaveBeenCalledWith('CHANGELOG.md', 'dist/CHANGELOG.md');
    expect(copySpy).toHaveBeenCalledWith('src/assets', 'dist/src/assets');

    done();
  });

  it('should pass whitelisted peers to ng-packagr', async (done) => {
    let cliCommand = mock.reRequire(requirePath);

    const skyPagesConfig = {
      skyux: {}
    };

    // Cover partial config.
    await cliCommand({}, skyPagesConfig);
    skyPagesConfig.skyux.librarySettings = {};
    await cliCommand({}, skyPagesConfig);

    const spy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    skyPagesConfig.skyux.librarySettings.whitelistedNonPeerDependencies = [
      'foobar'
    ];

    await cliCommand({}, skyPagesConfig);

    expect(spy).toHaveBeenCalledWith('temp/ng-package.json', {
      lib: {
        entryFile: 'public_api.ts'
      },
      whitelistedNonPeerDependencies: [
        'foobar'
      ]
    });

    done();
  });

  it('should prevent wildcard whitelisting', async (done) => {
    let cliCommand = mock.reRequire(requirePath);

    // See: https://github.com/ng-packagr/ng-packagr/blob/master/docs/dependencies.md#whitelisting-the-dependencies-section
    const skyPagesConfig = {
      skyux: {
        librarySettings: {
          whitelistedNonPeerDependencies: ['.']
        }
      }
    };

    const spy = spyOn(mockFs, 'writeJSONSync').and.callThrough();

    await cliCommand({}, skyPagesConfig);

    expect(spy).toHaveBeenCalledWith('temp/ng-package.json', {
      lib: {
        entryFile: 'public_api.ts'
      }
    });

    done();
  });
});
