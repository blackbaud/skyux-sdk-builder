/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');

describe('cli util ts-linter', () => {
  beforeEach(() => {
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
    const spawnSpy = jasmine.createSpyObj('spawn', ['sync']);
    mock('cross-spawn', spawnSpy);

    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    tsLinter.lintSync({});

    expect(spawnSpy.sync).toHaveBeenCalled();
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


  it('should push fix flag from argv', (done) => {
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
    tsLinter.lintAsync({ fix: true }).then(result => {
      expect(spawnFlags).toContain('--fix');
      done();
    });

    exitCallback(0);
  })
});
