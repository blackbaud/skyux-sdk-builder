/*jshint jasmine: true, node: true */
'use strict';

const path = require('path');
const mock = require('mock-require');

describe('config karma shared', () => {

  const testConfigFilename = '../config/webpack/test.webpack.config';

  afterEach(() => {
    mock.stopAll();
  });

  it('should load the webpack config', (done) => {
    let called = false;
    mock(testConfigFilename, {
      getWebpackConfig: () => {
        called = true;
        return {};
      }
    });

    mock.reRequire('../config/karma/shared.karma.conf')({
      set: () => {
        expect(called).toEqual(true);
        done();
      }
    });
  });

  it('should pass the right command name to skyPagesConfig', (done) => {
    const customCommand = 'custom-command';

    let commandCalled;

    spyOn(process.argv, 'slice').and.returnValue([customCommand]);

    mock(testConfigFilename, {
      getWebpackConfig: () => {}
    });

    mock('../config/sky-pages/sky-pages.config.js', {
      getSkyPagesConfig: (command) => {
        commandCalled = command;
        return {
          skyux: {}
        };
      }
    });

    mock.reRequire('../config/karma/shared.karma.conf')({
      set: () => {
        expect(commandCalled).toBe(customCommand);
        done();
      }
    });
  });

  it('should pass the logColor flag to the config', (done) => {
    mock('@blackbaud/skyux-logger', { logColor: false });
    mock.reRequire('../config/karma/shared.karma.conf')({
      set: (config) => {
        expect(config.colors).toBe(false);
        done();
      }
    });
  });

  it('should serve and proxy assets', (done) => {
    const cwd = 'custom-cwd';
    spyOn(process, 'cwd').and.returnValue(cwd);

    mock.reRequire('../config/karma/shared.karma.conf')({
      set: (config) => {
        expect(config.files.pop()).toEqual({
          pattern: `${cwd}/src/assets/**`,
          included: false,
          served: true
        });
        expect(config.proxies['/~/']).toContain(`/absolute${cwd}`);
        done();
      }
    });
  });

  it('should ignore anything outside the src directory in webpackMiddleware', (done) => {
    mock('../config/sky-pages/sky-pages.config.js', {
      getSkyPagesConfig: () => ({
        skyux: {}
      })
    });

    mock(testConfigFilename, {
      getWebpackConfig: () => {}
    });

    spyOn(path, 'resolve').and.callThrough();

    mock.reRequire('../config/karma/shared.karma.conf')({
      set: (config) => {
        const filter = config.webpackMiddleware.watchOptions.ignored;
        expect(filter).toBeDefined();

        expect(path.resolve).toHaveBeenCalled();
        expect(filter(path.join(process.cwd(), 'src'))).toBe(false);
        expect(filter(path.join(process.cwd(), 'node_modules'))).toBe(true);
        expect(filter(path.join(process.cwd(), '.skypageslocales'))).toBe(true);
        expect(filter(path.join(process.cwd(), 'coverage'))).toBe(true);

        done();
      }
    });
  });

  describe('code coverage', () => {
    let errorSpy;
    let infoSpy;

    const coverageProps = [
      'statements',
      'branches',
      'lines',
      'functions'
    ];

    beforeEach(() => {
      mock(testConfigFilename, {
        getWebpackConfig: () => {}
      });

      errorSpy = jasmine.createSpy('error');
      infoSpy = jasmine.createSpy('info');

      mock('@blackbaud/skyux-logger', {
        error: errorSpy,
        info: infoSpy
      });
    });

    afterEach(() => {
      mock.stopAll();
    });

    function mockConfig(codeCoverageThreshold) {
      mock('../config/sky-pages/sky-pages.config.js', {
        getSkyPagesConfig: () => ({
          skyux: {
            codeCoverageThreshold
          }
        })
      });
    }

    function checkCodeCoverage(thresholdName, thresholdPercent, callback) {
      mockConfig(thresholdName);

      mock.reRequire('../config/karma/shared.karma.conf')({
        set: (config) => {
          const thresholdConfig = config.coverageIstanbulReporter.thresholds.global;

          coverageProps.forEach((coverageProp) => {
            expect(thresholdConfig[coverageProp]).toEqual(thresholdPercent);
          });

          callback();
        }
      });
    }

    it('should handle codeCoverageThreshold when not set', (done) => {
      checkCodeCoverage(undefined, 0, done);
    });

    it('should handle codeCoverageThreshold set to "none"', (done) => {
      checkCodeCoverage('none', 0, done);
    });

    it('should handle codeCoverageThreshold set to "standard"', (done) => {
      checkCodeCoverage('standard', 80, done);
    });

    it('should handle codeCoverageThreshold set to "strict"', (done) => {
      checkCodeCoverage('strict', 100, done);
    });
  });

});
