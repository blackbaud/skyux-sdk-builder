/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');

describe('cli util ts-linter', () => {
  afterEach(() => {
    mock.stopAll();
  });

  function setupTest(output, failures, fixes, throwError) {
    spyOn(logger, 'info').and.returnValue();
    spyOn(logger, 'error').and.returnValue();

    mock('../config/sky-pages/sky-pages.config', {
      spaPath: (filePath) => filePath
    });

    const spyLinter = jasmine.createSpy('tslint');

    spyLinter.and.callFake(() => {
      const instance = jasmine.createSpyObj('linter', [
        'lint',
        'getResult'
      ]);

      instance.getResult.and.returnValue({
        errorCount: failures.length,
        failures: failures,
        output: output,
        fixes: fixes
      });

      if (throwError) {
        instance.lint.and.callFake(() => {
          throw new Error(throwError);
        });
      }

      return instance;
    });

    spyLinter.createProgram = jasmine.createSpy('createProgram').and.returnValue({
      getSourceFile: () => ({
        getFullText: () => {}
      })
    });

    spyLinter.getFileNames = jasmine.createSpy('getFileNames').and.returnValue([
      'some-file.js'
    ]);

    const spyFormat = jasmine.createSpy('format');
    spyLinter.spyFormat = spyFormat;

    mock('tslint', {
      findFormatter: () => {
        return function () {
          return {
            format: spyFormat
          }
        }
      },
      Configuration: {
        findConfiguration: () => ({
          results: {}
        })
      },
      Linter: spyLinter
    });

    return spyLinter;
  }

  it('should expose a lintSync method', () => {
    setupTest('', [], []);
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    expect(typeof tsLinter.lintSync).toEqual('function');
  });

  it('should catch a fatal error', () => {

    const error = 'custom-thrown-error';
    const instance = setupTest('', [], [], error);
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    const result = tsLinter.lintSync({});

    expect(result.errorOutput.toString()).toEqual(`Error: ${ error }`);
    expect(result.exitCode).toEqual(2);
  });

  it('should log an error if linting errors found', () => {

    const output = 'TEST OUTPUT';
    const errors = ['TEST ERROR'];

    setupTest(output, errors, []);

    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    const result = tsLinter.lintSync({});

    expect(result.errors).toEqual(errors)
    expect(result.errorOutput).toEqual('\n' + output);

    expect(result.exitCode).toEqual(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should not log an error if linting errors are not found', () => {

    setupTest('', [], []);

    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    const result = tsLinter.lintSync({});

    expect(result.exitCode).toEqual(0);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should pass argv.fix to options and log fixes', () => {
    const fixes = ['simple-fix'];

    const instance = setupTest('', [], fixes);
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    const result = tsLinter.lintSync({ fix: true });

    expect(instance.spyFormat.calls.mostRecent().args[0]).toEqual(fixes);
    expect(instance.calls.mostRecent().args[0]).toEqual({
      fix: true,
      formatter: 'stylish'
    });
  });

  it('should set formatter to vso if platform flag is vsts', () => {
    const instance = setupTest('', [], []);
    const tsLinter = mock.reRequire('../cli/utils/ts-linter');
    const result = tsLinter.lintSync({ platform: 'vsts' });

    expect(instance.calls.mostRecent().args[0].formatter).toBe('vso');
  });
});
