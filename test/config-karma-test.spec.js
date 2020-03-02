/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');

describe('config karma test', () => {
  const path = '../config/karma/shared.karma.conf';
  let called = false;
  let mockArgv;

  beforeEach(() => {
    mockArgv = {};

    mock(path, () => {
      called = true;
    });

    mock('rc', () => mockArgv);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should load the shared config', (done) => {
    mock.reRequire('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.browsers).toBeDefined();
        expect(called).toEqual(true);
        done();
      }
    });
  });

  it('should use a custom launcher for Travis', (done) => {
    process.env.TRAVIS = true;
    mock.reRequire('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.browsers[0]).toBe('Chrome_travis_ci');
        delete process.env.TRAVIS;
        done();
      }
    });
  });

  it('should use headless browser if --headless flag set', (done) => {
    mockArgv = {
      headless: true
    };

    mock.reRequire('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.browsers[0]).toBe('ChromeHeadless');
        done();
      }
    });
  });

  it('should include the desktop notifications reporter if --enableDesktopNotifications flag set without other reporters', (done) => {
    mockArgv = {
      enableDesktopNotifications: true
    };

    mock.reRequire('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.reporters).toContain('notify');
        done();
      }
    });
  });

  it('should include the desktop notifications reporter if --enableDesktopNotifications flag set with other reporters', (done) => {
    mockArgv = {
      enableDesktopNotifications: true
    };

    mock(path, (config) => {
      config.reporters = ['custom'];
    });

    mock.reRequire('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.reporters).toEqual(['custom', 'notify']);
        done();
      }
    });
  });

  it('should configure the mochaReporter to ignoreSkipped if --suppressUnfocusedTestOutput flag set', (done) => {
    mockArgv = {
      suppressUnfocusedTestOutput: true
    };

    mock.reRequire('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.mochaReporter).toEqual({ ignoreSkipped: true });
        done();
      }
    });
  });

});
