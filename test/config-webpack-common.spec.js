/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const path = require('path');
const fs = require('fs');
const runtimeUtils = require('../utils/runtime-test-utils');

describe('config webpack common', () => {
  function validateAppExtras(spaVersionExists) {
    const lib = require('../config/webpack/common.webpack.config');

    let existsSync = fs.existsSync;

    spyOn(fs, 'existsSync').and.callFake(function (filePath) {
      if (filePath.indexOf('app-extras.module') >= 0) {
        return spaVersionExists;
      }

      return existsSync.apply(fs, arguments);
    });

    let config = lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {
        mode: 'advanced'
      }
    });

    let alias = config.resolve.alias;

    let expectedAppExtrasAlias = spaVersionExists ?
      path.join(process.cwd(), 'src', 'app', 'app-extras.module.ts') :
      path.join(__dirname, '..', 'src', 'app', 'app-extras.module.ts');

    expect(
      alias['sky-pages-internal/src/app/app-extras.module']
    ).toBe(expectedAppExtrasAlias);
  }

  function getBabelRule(config) {
    return config.module.rules.find(rule => {
      return (rule && rule.use && rule.use.loader) === 'babel-loader';
    });
  }

  afterAll(() => {
    mock.stopAll();
  });

  it('should expose a getWebpackConfig method', () => {
    const lib = mock.reRequire('../config/webpack/common.webpack.config');
    expect(typeof lib.getWebpackConfig).toEqual('function');
  });

  it('should handle an advanced mode', () => {
    const lib = mock.reRequire('../config/webpack/common.webpack.config');
    const config = lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {
        mode: 'advanced'
      }
    });
    expect(config.entry.app[0]).toContain(process.cwd());
  });

  it('should default to the local app-extras module when not present in the SPA', () => {
    validateAppExtras(false);
  });

  it('should allow for an app-extras module to be provided by the SPA project', () => {
    validateAppExtras(true);
  });

  it('should pass --output-keep-alive to OutputKeepAlivePlugin', () => {
    let _options;

    mock('../plugin/output-keep-alive', {
      OutputKeepAlivePlugin: function OutputKeepAlivePlugin(options = {}) {
        _options = options;
      }
    });

    const lib = mock.reRequire('../config/webpack/common.webpack.config');
    lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {}
    }, {
      'output-keep-alive': true
    });

    expect(_options.enabled).toEqual(true);
  });

  function setupLogPlugin(command, argv = {}) {
    const skyPagesConfig = {
      runtime: runtimeUtils.getDefaultRuntime({
        command
      }),
      skyux: {}
    };

    let plugin = jasmine.createSpy('simple-progress-webpack-plugin');
    mock('simple-progress-webpack-plugin', plugin);
    mock('@blackbaud/skyux-logger', argv);

    const lib = mock.reRequire('../config/webpack/common.webpack.config');
    lib.getWebpackConfig(skyPagesConfig, argv);

    return plugin;
  }

  it('should not add the webpack plugin if --logFormat none', () => {
    const plugin = setupLogPlugin('', { logFormat: 'none' });
    expect(plugin).not.toHaveBeenCalled();
  });

  it('should pass the logFormat flag to the webpack plugin', () => {
    const format = 'custom-format';
    const plugin = setupLogPlugin('', { logFormat: format });
    expect(plugin.calls.first().args[0].format).toEqual(format);
  });

  it('should default the webplack property to compact for skyux serve', () => {
    const plugin = setupLogPlugin('serve');
    expect(plugin.calls.first().args[0].format).toEqual('compact');
  });

  it('should default the webplack property to compact if the --serve flag is used', () => {
    const plugin = setupLogPlugin('build', { 'serve': true });
    expect(plugin.calls.first().args[0].format).toEqual('compact');
  });

  it('should default the log property to expanded for all other skyux commands', () => {
    const plugin = setupLogPlugin('build');
    expect(plugin.calls.first().args[0].format).toEqual('expanded');
  });

  it('should pass the logColor flag to the log plugin', () => {
    const plugin = setupLogPlugin('', { logColor: true });
    expect(plugin.calls.first().args[0].color).toEqual(true);
  });

  it('should allow for custom alias resolution', () => {
    const lib = mock.reRequire('../config/webpack/common.webpack.config');

    const config = lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {
        moduleAliases: {
          '@skyux/foo': './src/app/public'
        }
      }
    });

    const alias = config.resolve.alias;

    expect(alias['@skyux/foo']).toBe(path.join(process.cwd(), './src/app/public'));
  });

  it('should allow for custom alias resolution for builds', () => {
    const lib = mock.reRequire('../config/webpack/common.webpack.config');

    const config = lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime({
        command: 'build'
      }),
      skyux: {
        moduleAliases: {
          '@skyux/foo': './src/app/public'
        }
      }
    });

    const alias = config.resolve.alias;

    expect(alias['@skyux/foo']).toBe(path.join(process.cwd(), '.skypagestmp/src/app/public'));
  });

  it('should allow for custom alias resolution for e2e', () => {
    const lib = mock.reRequire('../config/webpack/common.webpack.config');

    const config = lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime({
        command: 'e2e'
      }),
      skyux: {
        moduleAliases: {
          '@skyux/foo': './src/app/public'
        }
      }
    });

    const alias = config.resolve.alias;

    expect(alias['@skyux/foo']).toBe(path.join(process.cwd(), '.skypagestmp/src/app/public'));
  });

  it('should use the babel-loader only for the `ansi-regex` package in `node_modules`', () => {
    const lib = mock.reRequire('../config/webpack/common.webpack.config');

    const config = lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {
        moduleAliases: {
          '@skyux/foo': './src/app/public'
        }
      }
    });

    const babelRule = getBabelRule(config);
    expect(babelRule.test).toEqual(/(\|\/)(strip-ansi|ansi-regex)(\|\/)/);
    expect(babelRule.include).toEqual(/node_modules/);
  });

  it('should allow adding other packages to babel-loader', () => {
    const lib = mock.reRequire('../config/webpack/common.webpack.config');

    const config = lib.getWebpackConfig({
      runtime: runtimeUtils.getDefaultRuntime(),
      skyux: {
        incompatibleDependencies: ['foobar'],
        moduleAliases: {
          '@skyux/foo': './src/app/public'
        }
      }
    });

    const babelRule = getBabelRule(config);
    expect(babelRule.test).toEqual(/(\|\/)(strip-ansi|ansi-regex|foobar)(\|\/)/);
  });

});
