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

    mock('minimist', () => mockArgv);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should load the shared config', (done) => {
    require('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.browsers).toBeDefined();
        expect(called).toEqual(true);
        done();
      }
    });
  });

  it('should use a custom launcher for Travis', (done) => {
    process.env.TRAVIS = true;
    require('../config/karma/test.karma.conf')({
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

    require('../config/karma/test.karma.conf')({
      set: (config) => {
        expect(config.browsers[0]).toBe('ChromeHeadless');
        done();
      }
    });
  });
});
