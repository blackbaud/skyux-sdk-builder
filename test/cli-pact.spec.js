/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');
const portfinder = require('portfinder');
const pactServers = require('../utils/pact-servers');

describe('cli pact', () => {

  const specPattern = 'src/app/**/*.pact-spec.ts';
  let getSkyPagesConfigSpy;
  let httpProxySpy;
  let httpSpy;
  let portfinderSpy;
  let karmaUtilsSpy;

  beforeEach(() => {

    spyOn(logger, 'info');
    spyOn(logger, 'error');
    spyOn(process, 'exit');

    getSkyPagesConfigSpy = jasmine.createSpy('getSpyPagesConfig');
    getSkyPagesConfigSpy.and.returnValue({
      skyux: {
        pacts: [
          {
            provider: 'test-provider1',
            consumer: 'test-consumer1',
            spec: 1
          }
        ]
      }
    });
    mock('../config/sky-pages/sky-pages.config', {
      outPath: (path) => path,
      getSkyPagesConfig: getSkyPagesConfigSpy
    });

    portfinderSpy = jasmine.createSpyObj('portfinder', ['getPorts']);
    portfinderSpy.getPorts.and.callFake((count, options, cb) => {
      cb(undefined, [0]);
    });
    mock('portfinder', portfinderSpy);

    karmaUtilsSpy = jasmine.createSpyObj('karmaUtils', ['run']);
    mock('../cli/utils/karma-utils', karmaUtilsSpy);

    httpProxySpy = jasmine.createSpyObj('http-proxy', ['createProxyServer']);
    httpProxySpy.createProxyServer.and.returnValue({
      on: () => {},
      web: () => {}
    });
    mock('http-proxy', httpProxySpy);

    httpSpy = jasmine.createSpyObj('http', ['createServer']);
    httpSpy.createServer.and.returnValue({
      on: () => {},
      listen: () => {}
    });
    mock('http', httpSpy);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should log an error if no pacts in config', () => {
    getSkyPagesConfigSpy.and.returnValue({
      skyux: {}
    });

    mock.reRequire('../cli/pact')('', {});
    expect(logger.error).toHaveBeenCalledWith(
      'skyux pact failed! pacts does not exist on configuration file.'
    );
    expect(process.exit).toHaveBeenCalled();
  });

  it('exit if portfinder returns error', (done) => {
    const error = 'custom-portfinder-error';
    portfinderSpy.getPorts.and.callFake((count, options, cb) => {
      cb(error);
      expect(logger.error).toHaveBeenCalledWith(error);
      expect(process.exit).toHaveBeenCalled();
      done();
    });
    mock.reRequire('../cli/pact')('', {});
  });

  it('should support a custom host and custom port', (done) => {
    const pacts = [
      {
        provider: 'test-provider1',
        consumer: 'test-consumer1',
        host: 'custom-host',
        spec: 1
      },
      {
        provider: 'test-provider2',
        consumer: 'test-consumer2',
        port: 'custom-port',
        spec: 2
      }
    ];

    getSkyPagesConfigSpy.and.returnValue({
      skyux: {
        pacts
      }
    });

    spyOn(pactServers, 'savePactServer');

    portfinderSpy.getPorts.and.callFake((count, options, cb) => {
      const ports = pacts.map((pact, index) => 8000 + index );
      cb(undefined, ports);

      expect(count).toBe(pacts.length + 1);
      expect(pactServers.savePactServer).toHaveBeenCalledWith(
        pacts[0].provider,
        'custom-host',
        ports[0]
      );
      expect(pactServers.savePactServer).toHaveBeenCalledWith(
        pacts[1].provider,
        'localhost',
        pacts[1].port
      );
      done();
    });
    mock.reRequire('../cli/pact')('', {});
  });

  function testOriginHeader(expectedOrigin, done) {
    const ports = [8000, 8001];
    const origin = 'custom-origin';
    const httpProxyOn = {};
    const httpOn = {};
    const headers = {};
    const setHeaderSpy = jasmine.createSpy('setHeader');

    httpProxySpy.createProxyServer.and.returnValue({
      on: (evt, cb) => httpProxyOn[evt] = cb
    });

    httpSpy.createServer.and.returnValue({
      on: (evt, cb) => httpOn[evt] = cb,
      listen: (port, host) => {

        httpProxyOn['proxyReq']({
          setHeader: setHeaderSpy
        });

        httpProxyOn['proxyRes'](
          {
            headers
          },
          {
            headers: {
              origin
            }
          }
        );

        expect(port).toBe(ports[1]);
        expect(headers['Access-Control-Allow-Origin']).toBe(origin);
        expect(setHeaderSpy).toHaveBeenCalledWith(
          'Origin',
          expectedOrigin
        )
        done();
      }
    });

    portfinderSpy.getPorts.and.callFake((count, options, cb) => {
      cb(undefined, ports);
    });

    mock.reRequire('../cli/pact')('', {});
  }

  it('sets headers upon request and response on proxy server', (done) => {
    testOriginHeader('https://host.nxt.blackbaud.com', done);
  });

  it('sets custom headers upon request and response on proxy server', (done) => {
    const url = 'custom-url';

    getSkyPagesConfigSpy.and.returnValue({
      skyux: {
        pacts: [
          {
            provider: 'test-provider1',
            consumer: 'test-consumer1',
            spec: 1
          }
        ],
        host: {
          url
        }
      }
    });

    testOriginHeader(url, done);
  });

  it('gets correct pact server before call to proxy server', (done) => {
    const providerFullUrl = 'full-url';
    const req = {
      url: 'base/provider-that-does-exist/endpoint'
    };
    const res = {
      custom: true
    };

    spyOn(pactServers, 'getAllPactServers').and.returnValue({
      'provider-that-does-exist': true
    });
    spyOn(pactServers, 'getPactServer').and.returnValue({
      fullUrl: providerFullUrl
    });

    httpProxySpy.createProxyServer.and.returnValue({
      on: () => {},
      web: (webReq, webRes, options) => {
        expect(webReq).toEqual(req);
        expect(webRes).toEqual(res);
        expect(options).toEqual({
          target: providerFullUrl
        });
        done();
      }
    });

    httpSpy.createServer.and.callFake(cb => {
      cb(req, res);
      return {
        on: () => {},
        listen: () => {}
      }
    });

    mock.reRequire('../cli/pact')('', {});
  });

  it('logs error when malformed proxy url is requested', (done) => {
    spyOn(pactServers, 'getAllPactServers').and.returnValue({
      'provider-that-does-not-exist': false
    });
    httpSpy.createServer.and.callFake(cb => {
      const req = {
        url: 'bad-url'
      };

      cb(req, {});
      return {
        on: () => {},
        listen: () => {
          expect(logger.error).toHaveBeenCalledWith(
            `Pact proxy path is invalid.  Expected format is base/provider-name/api-path.`
          );
          done();
        }
      }
    });

    mock.reRequire('../cli/pact')('', {});
  });

  it('logs when proxy server is successfully started', () => {
    const ports = [8000];
    const httpOn = {};

    httpSpy.createServer.and.returnValue({
      on: (evt, cb) => httpOn[evt] = cb,
      listen: () => {}
    });

    portfinderSpy.getPorts.and.callFake((count, options, cb) => {
      cb(undefined, ports);
    });

    mock.reRequire('../cli/pact')('', {});
    httpOn['connect']();
    expect(logger.info).toHaveBeenCalledWith(
      `Pact proxy server successfully started on http://localhost:${ports[ports.length - 1]}`
    );
  });

  it('should pass command, argv, and specPattern to karmaUtils.run', () => {
    const argv = { custom: true };
    const command = 'custom-command1';
    const pact = mock.reRequire('../cli/pact');

    pact(command, argv);

    expect(karmaUtilsSpy.run.calls.argsFor(0)[1].command).toBe(command);
    expect(karmaUtilsSpy.run).toHaveBeenCalledWith(
      command,
      argv,
      specPattern
    );
  });

  it('should use process.argv if no arguments passed in', () => {
    const argvClean = process.argv;
    const argv = { process: true };
    const command = 'custom-command2';

    process.argv = argv;
    const pact = mock.reRequire('../cli/pact');

    pact(command);
    expect(karmaUtilsSpy.run).toHaveBeenCalledWith(
      command,
      argv,
      specPattern
    );

    process.argv = argvClean;
  });

});
