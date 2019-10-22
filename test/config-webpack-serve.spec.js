/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const runtimeUtils = require('../utils/runtime-test-utils');

describe('config webpack serve', () => {

  let spyCertResolver;

  beforeEach(() => {
    spyCertResolver = jasmine.createSpyObj('certResolver', ['readCert', 'readKey']);
    mock('../cli/utils/cert-resolver', spyCertResolver);
  });

  it('should expose a getWebpackConfig method', () => {
    const lib = require('../config/webpack/serve.webpack.config');
    expect(typeof lib.getWebpackConfig).toEqual('function');
  });

  it('should only open the browser once', () => {

    let browserSpy = jasmine.createSpy('browser');
    mock('../cli/utils/browser', browserSpy);

    const lib = mock.reRequire('../config/webpack/serve.webpack.config');
    const config = lib.getWebpackConfig({}, runtimeUtils.getDefault());

    config.plugins.forEach(plugin => {
      if (plugin.name === 'WebpackPluginDone') {
        plugin.apply({
          options: {
            appConfig: {
              base: 'my-custom-base'
            },
            devServer: {
              port: 1234
            }
          },
          plugin: (evt, cb) => {
            if (evt === 'done') {

              // Simulating a save by calling callback twice
              cb({
                toJson: () => ({
                  chunks: []
                })
              });

              cb({
                toJson: () => ({
                  chunks: []
                })
              });

              expect(browserSpy).toHaveBeenCalledTimes(1);
            }
          }
        });
      }
    });

  });

  it('should pass argv to cert-resolver and call the readCert and readKey methods', () => {
    const lib = mock.reRequire('../config/webpack/serve.webpack.config');
    const argv = { custom: true };

    lib.getWebpackConfig(argv, runtimeUtils.getDefault());
    expect(spyCertResolver.readCert).toHaveBeenCalledWith(argv);
    expect(spyCertResolver.readKey).toHaveBeenCalledWith(argv);
  });

});
