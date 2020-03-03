/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');

describe('config protractor test', () => {
  let lib;
  let config;
  let mockArgv;

  beforeEach(() => {
    mockArgv = {
      _: ['e2e']
    };
    mock('rc', () => mockArgv);

    lib = mock.reRequire('../config/protractor/protractor.conf.js');
    config = lib.config;
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should return a config object', () => {
    expect(lib.config).toBeDefined();
  });

  it('should provide a method for beforeLaunch', () => {
    let called = false;
    mock('ts-node', {
      register: () => {
        called = true;
      }
    });

    expect(config.beforeLaunch).toBeDefined();
    config.beforeLaunch();
    expect(called).toBe(true);
  });

  it('should provide a method for onPrepare', () => {
    let called = false;
    spyOn(jasmine, 'getEnv').and.returnValue({
      addReporter: () => {
        called = true;
      }
    });

    config.onPrepare();
    expect(jasmine.getEnv).toHaveBeenCalled();
    expect(called).toEqual(true);
  });

  it('should pass the logColor flag to the config', () => {
    mock('@blackbaud/skyux-logger', { logColor: false });
    lib = mock.reRequire('../config/protractor/protractor.conf.js');
    expect(lib.config.jasmineNodeOpts.showColors).toBe(false);
  });

  it('should use headless browser if --headless flag set', () => {
    mockArgv.headless = false;
    lib = mock.reRequire('../config/protractor/protractor.conf.js');
    let chromeArgs = lib.config.capabilities.chromeOptions.args;
    expect(chromeArgs.indexOf('--headless') > -1).toEqual(false);

    mockArgv.headless = true;
    lib = mock.reRequire('../config/protractor/protractor.conf.js');
    chromeArgs = lib.config.capabilities.chromeOptions.args;
    expect(chromeArgs.indexOf('--headless') > -1).toEqual(true);
  });
});
