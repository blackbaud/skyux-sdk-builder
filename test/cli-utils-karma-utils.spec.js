/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');

describe('cli util run-karma', () => {

  let tslinterSpy;
  let localeAssetsProcessorSpy;
  let serverSpy;
  let serverStartSpy;
  let globSpy;
  let karmaHooks;

  beforeEach(() => {
    spyOn(logger, 'info');
    spyOn(logger, 'warn');
    spyOn(logger, 'error');
    spyOn(logger, 'verbose');
    spyOn(global, 'setTimeout').and.callFake(cb => cb());

    mock('../config/sky-pages/sky-pages.config', {
      outPath: (path) => path
    });

    mock('../cli/utils/config-resolver', {
      resolve: (command) => `${command}-config.js`
    });

    globSpy = jasmine.createSpyObj('glob', ['sync']);
    globSpy.sync.and.returnValue(['example.spec.js']);
    mock('glob', globSpy);

    tslinterSpy = jasmine.createSpyObj('tslinter', ['lintAsync']);
    mock('../cli/utils/ts-linter', tslinterSpy);

    serverSpy = jasmine.createSpy('server');
    serverStartSpy = jasmine.createSpy('server-start');
    serverSpy.prototype.on = (evt, cb) => {
      karmaHooks[evt] = karmaHooks[evt] || [];
      karmaHooks[evt].push(cb);
    };
    serverSpy.prototype.start = serverStartSpy;
    karmaHooks = {};

    mock('karma', {
      config: {
        parseConfig: () => ''
      },
      Server: serverSpy
    });

    localeAssetsProcessorSpy = jasmine.createSpyObj('locale', ['prepareLocaleFiles']);
    mock('../lib/locale-assets-processor', localeAssetsProcessorSpy);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should exit if no specs found', (done) => {
    const command = 'custom';

    globSpy.sync.and.returnValue([]);
    mock.reRequire('../cli/utils/karma-utils')
      .run(command, {}, '')
      .then(exitCode => {
        expect(exitCode).toBe(0);
        expect(logger.info).toHaveBeenCalledWith(
          `No spec files located. Skipping ${command} command.`
        );
        done();
      });
  });

  it('should start locale processor in run_start', () => {
    mock.reRequire('../cli/utils/karma-utils').run('', {}, '');
    karmaHooks['run_start'][0]();
    expect(localeAssetsProcessorSpy.prepareLocaleFiles).toHaveBeenCalled();
  });

  it('should start tslinter in run_start if watch', () => {
    const argv = { custom: true };
    mock.reRequire('../cli/utils/karma-utils').run('watch', argv, '');
    karmaHooks['run_start'][1]();
    expect(tslinterSpy.lintAsync).toHaveBeenCalledWith(argv);
  });

  it('should log a warning in browser_error', () => {
    mock.reRequire('../cli/utils/karma-utils').run('', {}, '');
    karmaHooks['browser_error'][0]();
    expect(logger.warn).toHaveBeenCalledWith(
      'Experienced a browser disconnect error.  Karma will retry up to 3 times.'
    );
  });

  it('should log an additioanl warning in browser_error if watch', () => {
    mock.reRequire('../cli/utils/karma-utils').run('watch', {}, '');
    karmaHooks['browser_error'][1]();
    expect(logger.warn).toHaveBeenCalledWith(
      'You may be interested in using the `--no-lint` flag or refactoring your SPA.'
    );
  });

  it('should call setTimeout from run_complete and resolve exitCode if watch', (done) => {
    const tslinterResults = {
      executionTime: 3,
      exitCode: 2,
      output: 'example-output'
    };

    tslinterSpy.lintAsync.and.returnValue({
      then: (cb) => cb(tslinterResults)
    });

    mock.reRequire('../cli/utils/karma-utils')
      .run('watch', {}, '')
      .then(exitCode => {
        expect(logger.error).toHaveBeenCalledWith(tslinterResults.output);
        expect(logger.info).toHaveBeenCalledWith(
          `TSLint completed in ${tslinterResults.executionTime}ms.`
        );
        expect(exitCode).toBe(tslinterResults.exitCode);
        done();
      });

    karmaHooks['run_start'][1]();
    karmaHooks['run_complete'][0]();
    serverSpy.calls.allArgs()[0][1](0);
  });

  it('should remove the first tslint promise and log a warning on browser_error', (done) => {
    mock.reRequire('../cli/utils/karma-utils')
      .run('watch', {}, '')
      .then(exitCode => {
        expect(logger.verbose).toHaveBeenCalledWith(
          `TSLint instance invalid.  Ignoring results.`
        );
        done();
      });

    karmaHooks['run_start'][1]();
    karmaHooks['browser_error'][1]();
    karmaHooks['run_complete'][0]();
    serverSpy.calls.allArgs()[0][1](1);
  });

  it('should log verbose if another run is already scheduled', (done) => {

    const tslinterResults = {
      executionTime: 4
    };

    tslinterSpy.lintAsync.and.returnValue({
      then: (cb) => cb(tslinterResults)
    });

    mock.reRequire('../cli/utils/karma-utils')
      .run('watch', {}, '')
      .then(exitCode => {
        expect(logger.verbose).toHaveBeenCalledWith(
          `TSLint completed in ${tslinterResults.executionTime}ms.`
        );
        expect(logger.verbose).toHaveBeenCalledWith(
          `Message hidden.  Queue length: 1`
        );
        expect()
        done();
      });

    karmaHooks['run_start'][1]();
    karmaHooks['run_start'][1]();
    karmaHooks['run_complete'][0]();
    serverSpy.calls.allArgs()[0][1](1);
  });
});
