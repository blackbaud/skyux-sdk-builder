/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');
const runtimeUtils = require('../utils/runtime-test-utils');
const localeAssetsProcessor = require('../lib/locale-assets-processor');

describe('cli utils run build', () => {
  let mockAssetsProcessor;
  let mockLocaleProcessor;
  let mockFsExtra;

  let skyPagesConfigUtil;

  beforeEach(() => {
    skyPagesConfigUtil = mock.reRequire('../config/sky-pages/sky-pages.config');

    mockLocaleProcessor = {
      getDefaultLocaleFiles: localeAssetsProcessor.getDefaultLocaleFiles,
      prepareLocaleFiles() {},
      isLocaleFile() {}
    };

    mockAssetsProcessor = {
      setSkyAssetsLoaderUrl() {},
      getAssetsUrl: () => '',
      processAssets: (content, assetsUrl, callback) => {
        callback('file-with-hash.json', 'physical-file-path.json');
        return content;
      }
    };

    mockFsExtra = {
      copySync() {},
      emptyDirSync() {},
      ensureDirSync() {},
      ensureFileSync() {},
      readFileSync() {
        return '{}';
      },
      readJsonSync() {
        return {
          compilerOptions: {}
        };
      },
      removeSync() {},
      writeFileSync() {},
      writeJSONSync() {},
      writeJsonSync() {}
    };

    spyOn(process, 'exit').and.callFake(() => {});
    mock('../cli/utils/ts-linter', {
      lintSync: () => {
        return {
          exitCode: 0
        };
      }
    });
    mock('../lib/plugin-file-processor', {
      processFiles: () => {}
    });
    mock('../lib/locale-assets-processor', mockLocaleProcessor);
    mock('../lib/assets-processor', mockAssetsProcessor);
    mock('fs-extra', mockFsExtra);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should call getWebpackConfig', () => {
    let called = false;
    mock('../config/webpack/build.webpack.config', {
      getWebpackConfig: () => {
        called = true;
        return {};
      }
    });

    mock.reRequire('../cli/utils/run-build')({}, {}, () => ({
      run: () => {}
    }));
    expect(called).toEqual(true);
  });

  it('should call webpack and handle errors', (done) => {
    spyOn(logger, 'error');
    mock('../config/webpack/build.webpack.config', {
      getWebpackConfig: () => ({})
    });

    const customError = 'custom-error1';
    mock.reRequire('../cli/utils/run-build')({}, {}, () => ({
      run: (cb) => {
        cb(customError);
      }
    })).then(() => {}, (err) => {
      expect(err).toEqual(customError);
      done();
    });
  });

  it('should write files to disk in AoT compile mode', (done) => {
    const generator = mock.reRequire('../lib/sky-pages-module-generator');

    const f = '../config/webpack/build-aot.webpack.config';

    mock(f, {
      getWebpackConfig: () => ({})
    });

    const writeJSONSpy = spyOn(mockFsExtra, 'writeJSONSync');
    const copySpy = spyOn(mockFsExtra, 'copySync');
    const writeFileSpy = spyOn(mockFsExtra, 'writeFileSync');
    const removeSpy = spyOn(mockFsExtra, 'removeSync');

    spyOn(generator, 'getSource').and.callFake(function () {
      return 'TESTSOURCE';
    });

    mock.reRequire('../cli/utils/run-build')(
      {},
      {
        runtime: runtimeUtils.getDefaultRuntime(),
        skyux: {
          compileMode: 'aot'
        }
      },
      () => ({
        run: (cb) => {
          cb(
            null,
            {
              toJson: () => ({
                errors: [],
                warnings: []
              })
            }
          );
        }
      })
    ).then(() => {
      // The temp folder should be deleted after the build is complete.
      expect(removeSpy).toHaveBeenCalledWith(
        skyPagesConfigUtil.spaPathTemp()
      );
      done();
    });

    // The default SKY UX Builder source files should be written first.
    expect(copySpy.calls.argsFor(1)).toEqual([
      skyPagesConfigUtil.outPath('src'),
      skyPagesConfigUtil.spaPathTempSrc()
    ]);

    // The SPA project's files should be written next, overwriting any
    // files from SKY UX Builder's default source.
    expect(copySpy.calls.argsFor(1)).toEqual([
      skyPagesConfigUtil.spaPath('src'),
      skyPagesConfigUtil.spaPathTempSrc()
    ]);

    // Ensure the SKY UX Builder module is written to disk.
    expect(writeFileSpy).toHaveBeenCalledWith(
      skyPagesConfigUtil.spaPathTempSrc('app', 'sky-pages.module.ts'),
      'TESTSOURCE',
      {
        encoding: 'utf8'
      }
    );

    // Ensure the TypeScript config file is written to disk.
    expect(writeJSONSpy).toHaveBeenCalledWith(
      skyPagesConfigUtil.spaPathTempSrc('tsconfig.json'),
      jasmine.objectContaining({
        include: [
          '../../node_modules/@skyux-sdk/builder/runtime/**/*',
          '**/*'
        ]
      })
    );

    expect(copySpy).toHaveBeenCalledWith(
      'physical-file-path.json',
      skyPagesConfigUtil.outPath('dist', 'file-with-hash.json')
    );
  });

  it('should allow the assets base URL to be specified', (done) => {
    const f = '../config/webpack/build-aot.webpack.config';

    mock(f, {
      getWebpackConfig: () => ({})
    });

    const setSkyAssetsLoaderUrlSpy = spyOn(mockAssetsProcessor, 'setSkyAssetsLoaderUrl');

    mock.reRequire('../cli/utils/run-build')(
      {
        assets: 'https://example.com/'
      },
      {
        runtime: runtimeUtils.getDefaultRuntime(),
        skyux: {
          compileMode: 'aot'
        }
      },
      () => ({
        run: (cb) => {
          try {
            cb(
              null,
              {
                toJson: () => ({
                  errors: [],
                  warnings: []
                })
              }
            );

            expect(setSkyAssetsLoaderUrlSpy).toHaveBeenCalledWith(
              jasmine.any(Object),
              jasmine.any(Object),
              'https://example.com/',
              undefined
            );
          } finally {
            done();
          }
        }
      })
    );

  });

  it('should fail the build if linting errors are found', (done) => {
    mock.stop('../cli/utils/ts-linter');

    const errors = 'Custom Linting Error';
    mock('../cli/utils/ts-linter', {
      lintSync: () => {
        return {
          exitCode: 1,
          errors
        };
      }
    });
    mock.reRequire('../cli/utils/run-build')({}, {
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {}
    }).catch(err => {
      expect(err).toBe(errors);
      done();
    });
  });

  it('should serve and browse to the built files if serve flag is present', (done) => {
    const port = 1234;

    mock('../cli/utils/server', {
      start: () => Promise.resolve(port)
    });

    mock('../cli/utils/browser', (argv, c, s, p) => {
      expect(argv.serve).toBe(true);
      expect(p).toBe(port);
      done();
    });

    mock.reRequire('../cli/utils/run-build')({ serve: true }, runtimeUtils.getDefault(), () => ({
      run: (cb) => {
        cb(
          null,
          {
            toJson: () => ({
              errors: [],
              warnings: []
            })
          }
        );
      }
    }));
  });

  it('should call prepareLocaleFiles()', () => {
    const spy = spyOn(mockLocaleProcessor, 'prepareLocaleFiles').and.callThrough();

    mock('../config/webpack/build.webpack.config', {
      getWebpackConfig: () => ({})
    });

    mock.reRequire('../cli/utils/run-build')({}, {}, () => ({
      run: () => {}
    }));
    expect(spy).toHaveBeenCalledWith();
  });

  it('should add module aliases to tsconfig.json "paths" during AoT build', (done) => {

    mock('../config/webpack/build-aot.webpack.config', {
      getWebpackConfig: () => ({})
    });

    const fsSpy = spyOn(mockFsExtra, 'writeJSONSync').and.callThrough();

    const runBuild = mock.reRequire('../cli/utils/run-build');

    runBuild({}, {
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {
        compileMode: 'aot',
        moduleAliases: {
          '@foobar': 'foo/bar/baz.ts'
        }
      }
    }, () => ({
      run: (cb) => {
        cb(
          null,
          {
            toJson: () => ({
              errors: [],
              warnings: []
            })
          }
        );
      }
    })).then(() => {
      const tsConfig = fsSpy.calls.argsFor(0)[1];
      const compilerOptionsPath = tsConfig.compilerOptions.paths['@foobar'][0];
      expect(compilerOptionsPath).toEqual(
        skyPagesConfigUtil.spaPathTemp('foo/bar/baz.ts')
      );
      done();
    });
  });

  it('should apply supported properties to `compilerOptions` from SPA\'s tsconfig.json', (done) => {

    mock('../config/webpack/build-aot.webpack.config', {
      getWebpackConfig: () => ({})
    });

    spyOn(mockFsExtra, 'readJsonSync').and.returnValue({
      compilerOptions: {
        esModuleInterop: true,
        foo: 'bar'
      }
    });

    const fsSpy = spyOn(mockFsExtra, 'writeJSONSync').and.callThrough();

    const runBuild = mock.reRequire('../cli/utils/run-build');

    runBuild({}, {
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {
        compileMode: 'aot'
      }
    }, () => ({
      run: (cb) => {
        cb(
          null,
          {
            toJson: () => ({
              errors: [],
              warnings: []
            })
          }
        );
      }
    })).then(() => {
      const tsConfig = fsSpy.calls.argsFor(0)[1];
      expect(tsConfig.compilerOptions.esModuleInterop).toEqual(true);
      expect(tsConfig.compilerOptions.foo).toBeUndefined();
      done();
    }).catch(err => fail(err));
  });
});
