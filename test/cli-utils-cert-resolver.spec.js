/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');

describe('utils/cert-resolver.js', () => {

  beforeEach(() => {
    spyOn(logger, 'error');
    spyOn(logger, 'info');
  });

  function spyOnFS() {
    const spyFS = jasmine.createSpyObj('fs', ['pathExistsSync', 'readFileSync']);
    mock('fs-extra', spyFS);
    return spyFS;
  }

  function getLib() {
    return mock.reRequire('../cli/utils/cert-resolver');
  }

  it('should expose getCert and getKey methods', () => {
    const lib = getLib();
    expect(lib.readCert).toBeDefined();
    expect(lib.readKey).toBeDefined();
  });

  it('should handle sslCert and sslKey not passed in', () => {
    const lib = getLib();
    lib.readCert({});
    lib.readKey({});

    expect(logger.error).toHaveBeenCalledWith(
      `Unable to resolve certificate property sslCert (code 0).`
    );
    expect(logger.error).toHaveBeenCalledWith(
      `Unable to resolve certificate property sslKey (code 0).`
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Please install the latest SKY UX CLI and run `skyux certs install`.'
    );
  });

  it('should handle sslCert and sslKey not existing', () => {
    const spyFS = spyOnFS();
    const lib = getLib();

    spyFS.pathExistsSync.and.returnValue(false);

    lib.readCert({ sslCert: 'asdf' });
    lib.readKey({ sslKey: 'asdf' });

    expect(logger.error).toHaveBeenCalledWith(
      `Unable to resolve certificate property sslCert (code 1).`
    );
    expect(logger.error).toHaveBeenCalledWith(
      `Unable to resolve certificate property sslKey (code 1).`
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Please install the latest SKY UX CLI and run `skyux certs install`.'
    );
  });

  it('should return contents of sslCert and sslKey', () => {
    const spyFS = spyOnFS();
    const lib = getLib();

    spyFS.pathExistsSync.and.returnValue(true);
    spyFS.readFileSync.and.callFake(p => `${p}-content`);

    const cert = lib.readCert({ sslCert: 'custom-cert' });
    const key = lib.readKey({ sslKey: 'custom-key' });

    expect(cert).toBe('custom-cert-content');
    expect(key).toBe('custom-key-content');
  });
});
