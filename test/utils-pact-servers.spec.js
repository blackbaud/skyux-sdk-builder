/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');

describe('pact-servers', () => {

  it('should save and get pact servers', () => {

    const pactServers = mock.reRequire('../utils/pact-servers');

    pactServers.savePactServer('test-provider', 'localhost', '1234');

    expect(pactServers.getPactServer('test-provider').fullUrl).toEqual('http://localhost:1234');
    expect(pactServers.getPactServer('test-provider').host).toEqual('localhost');
    expect(pactServers.getPactServer('test-provider').port).toEqual('1234');
    console.log(pactServers.getAllPactServers());
    expect(pactServers.getAllPactServers()).toEqual({
      'test-provider': {
        host: 'localhost',
        port: '1234',
        fullUrl: `http://localhost:1234`
      }
    });
  });

  it('should save and get pact proxy server', () => {

    const pactServers = mock.reRequire('../utils/pact-servers');

    pactServers.savePactProxyServer('http://localhost:8000');

    expect(pactServers.getPactProxyServer()).toEqual('http://localhost:8000');

  });

});
