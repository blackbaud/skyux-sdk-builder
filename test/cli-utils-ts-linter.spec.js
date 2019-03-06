/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');

describe('cli util ts-linter', () => {
  beforeEach(() => {
    spyOn(process, 'exit');
    spyOn(logger, 'info');
    spyOn(logger, 'error');

    mock('../config/sky-pages/sky-pages.config', {
      spaPath: (filePath) => filePath
    });

  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should expose a lintSync method', () => {
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    expect(typeof tsLinter.lintSync).toEqual('function');
  });

  it('should expose a lintAsync method', () => {
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    expect(typeof tsLinter.lintAsync).toEqual('function');
  });

  it('should spawn tslint asynchronously', (done) => {
    let exitCallback;
    const spawnSpy = jasmine.createSpy('spawn').and.returnValue({
      on: (evt, cb) => {
        exitCallback = cb;
      },
      stderr: {
        on: () => {}
      },
      stdout: {
        on: () => {}
      }
    });

    mock('cross-spawn', spawnSpy);

    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    tsLinter.lintAsync({}).then(result => {
      expect(spawnSpy).toHaveBeenCalled();
      expect(result.exitCode).toEqual(0);
      done();
    });

    exitCallback(0);
  });

  it('should spawn tslint synchronously', () => {
    const status = 1;
    const spawnSpy = jasmine.createSpyObj('spawn', ['sync']);
    spawnSpy.sync.and.returnValue({
      status
    });
    mock('cross-spawn', spawnSpy);

    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    const result = tsLinter.lintSync({});

    expect(spawnSpy.sync).toHaveBeenCalled();
    expect(result.exitCode).toBe(status);
    expect(result.executionTime).toBeDefined();
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should abort linting synchronously', () => {
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    const result = tsLinter.lintSync({ lint: false });
    expect(logger.info).toHaveBeenCalledWith(
      'TSLint synchronous skipped.'
    );
    expect(result).toEqual({
      executionTime: 0,
      exitCode: 0,
      output: ''
    });
  });

  it('should abort linting asychronously', (done) => {
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    tsLinter.lintAsync({ lint: false }).then(result => {
      expect(result).toEqual({
        executionTime: 0,
        exitCode: 0,
        output: 'TSLint asynchronous skipped.'
      });
      done();
    });
  });

  function testAsyncOutput(sendErrors, done) {
    const stderrError = 'first error';
    const stdoutError = 'second error';
    const stderrErrorBuffer = Buffer.from(stderrError);
    const stdoutErrorBuffer = Buffer.from(stdoutError);
    let exitCallback;
    let stderrCallback;
    let stdoutCallback;

    mock('../config/sky-pages/sky-pages.config', {
      spaPath: (filePath) => filePath
    });
    mock('cross-spawn', () => ({
      on: (evt, cb) => {
        exitCallback = cb;
      },
      stderr: {
        on: (evt, cb) => {
          stderrCallback = cb;
        }
      },
      stdout: {
        on: (evt, cb) => {
          stdoutCallback = cb;
        }
      }
    }));
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    tsLinter.lintAsync({}).then(result => {
      expect(result.exitCode).toEqual(1);

      if (sendErrors) {
        expect(result.output).toContain(stderrError);
        expect(result.output).toContain(stdoutError);
      } else {
        expect(result.output).not.toContain(stderrError);
        expect(result.output).not.toContain(stdoutError);
      }



      done();
    });

    if (sendErrors) {
      stderrCallback(stderrErrorBuffer);
      stdoutCallback(stdoutErrorBuffer);
    }

    exitCallback(1);
  }

  it('should add linting errors to output', (done) => {
    testAsyncOutput(true, done);
  });

  it('should not add linting errors to output', (done) => {
    testAsyncOutput(false, done);
  });

  function testFlags(argv, cb) {
    let spawnFlags;
    let exitCallback;

    mock('cross-spawn', (command, flags) => {
      spawnFlags = flags;
      return {
        on: (evt, cb) => {
          exitCallback = cb;
        },
        stderr: {
          on: () => {}
        },
        stdout: {
          on: () => {}
        }
      };
    });
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    tsLinter.lintAsync(argv).then(result => {
      cb(spawnFlags);
    });

    exitCallback(0);
  }

  it('should push fix flag from argv', (done) => {
    testFlags({ fix: true }, flags => {
      expect(flags).toContain('--fix');
      expect(flags.indexOf('--fix')).toBe(flags.length - 1);
      done();
    });
  });

  it('should default to the stylish format', (done) => {
    testFlags({}, flags => {
      expect(flags).toContain('--format');
      expect(flags[flags.length - 1]).toBe('stylish');
      done();
    });
  })

  it('should not add format flag if it already exists', (done) => {
    testFlags({ format: 'custom' }, flags => {
      expect(flags).toContain('--format');
      expect(flags).toContain('custom');
      expect(flags).not.toContain('stylish');
      done();
    });
  });

  it('should set format to vso if the platform flag is vsts', (done) => {
    testFlags({ platform: 'vsts' }, flags => {
      expect(flags).toContain('--format');
      expect(flags).toContain('vso');
      done();
    });
  })
});
