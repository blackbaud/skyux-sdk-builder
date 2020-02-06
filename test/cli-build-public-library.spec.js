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

  it('should copy the runtime folder before compiling then clean it before packaging', (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockFs, 'copySync').and.callThrough();
    cliCommand({}, {}).then(() => {
      expect(spy).toHaveBeenCalledWith('builder/runtime', 'temp/runtime');
      expect(rimraf.sync).toHaveBeenCalledTimes(4);
      done();
    });
  });

  it('should clean the dist and temp directories', (done) => {
    const pathSpy = spyOn(mockSkyPagesConfig, 'spaPath').and.callThrough();
    const pathTempSpy = spyOn(mockSkyPagesConfig, 'spaPathTemp').and.callThrough();
    const cliCommand = mock.reRequire(requirePath);
    cliCommand({}, {}).then(() => {
      expect(rimraf.sync).toHaveBeenCalledWith('temp');
      expect(rimraf.sync).toHaveBeenCalledWith('dist');
      expect(pathTempSpy).toHaveBeenCalledWith();
      expect(pathSpy).toHaveBeenCalledWith('dist');
      done();
    });
  });

  it('should write a tsconfig.json file', (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    cliCommand({}, {}).then(() => {
      expect(spy).toHaveBeenCalledWith('temp/tsconfig.json', {
        extends: 'node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json',
        compilerOptions: {
          lib: ['dom', 'es6']
        }
      });
      done();
    });
  });

  it('should write a ng-package.json file for the primary entry point', (done) => {
    const writeSpy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    const cliCommand = mock.reRequire(requirePath);

    cliCommand({}, {}).then(() => {
      expect(writeSpy).toHaveBeenCalledWith('temp/ng-package.json', {
        lib: {
          entryFile: 'index.ts'
        }
      });
      done();
    });
  });

  it('should fail the build if linting errors are found', (done) => {
    mock.stop('../cli/utils/ts-linter');
    mock('../cli/utils/ts-linter', {
      lintSync: () => {
        return {
          exitCode: 1
        };
      }
    });
    const cliCommand = mock.reRequire(requirePath);
    cliCommand({}, {}).then(() => {
      expect(process.exit).toHaveBeenCalledWith(1);
      done();
    });
  });

  it('should handle transpilation errors', (done) => {
    const error = new Error('Packaging error.');
    mockPackagerBuildResult = Promise.reject(error);
    const spy = spyOn(logger, 'error');
    const cliCommand = mock.reRequire(requirePath);
    cliCommand({}, {}).then(() => {
      expect(spy).toHaveBeenCalledWith(error);
      done();
    });
  });

  it('should process files', (done) => {
    const cliCommand = mock.reRequire(requirePath);
    const spy = spyOn(mockPluginFileProcessor, 'processFiles').and.callThrough();

    cliCommand({}, {}).then(() => {
      expect(spy).toHaveBeenCalled();
      done();
    });
  });

  it('should include testing entry point if directory exists', (done) => {
    spyOn(mockFs, 'existsSync').and.returnValue(true);

    const writeSpy = spyOn(mockFs, 'writeJSONSync').and.callThrough();
    const pathSpy = spyOn(mockSkyPagesConfig, 'spaPathTemp').and.callThrough();

    const cliCommand = mock.reRequire(requirePath);
    cliCommand({}, {}).then(() => {
      expect(pathSpy).toHaveBeenCalledWith('testing');
      expect(writeSpy).toHaveBeenCalledWith('temp/testing/ng-package.json', {
        lib: {
          entryFile: 'index.ts'
        }
      });
      done();
    });
  });

  it('should copy readme, changelog, and assets to dist', (done) => {
    spyOn(mockFs, 'existsSync').and.returnValue(true);
    const copySpy = spyOn(mockFs, 'copySync').and.returnValue();

    const cliCommand = mock.reRequire(requirePath);
    cliCommand().then(() => {
      expect(copySpy).toHaveBeenCalledWith('README.md', 'dist/README.md');
      expect(copySpy).toHaveBeenCalledWith('CHANGELOG.md', 'dist/CHANGELOG.md');
      expect(copySpy).toHaveBeenCalledWith('src/assets', 'dist/src/assets');
      done();
    });
  });
});
