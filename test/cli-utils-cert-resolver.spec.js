/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');
const logger = require('@blackbaud/skyux-logger');

describe('utils/cert-resolver.js', () => {

  beforeEach(() => {
    spyOn(logger, 'error');
    spyOn(logger, 'info');
  });

  it('should expose a getResolver method', () => {
    const resolver = mock.reRequire('../cli/utils/cert-resolver');
    expect(resolver.getResolver).toBeDefined();
  });

  it('should require sslRoot be passed in with argv', () => {
    const resolver = mock.reRequire('../cli/utils/cert-resolver');
    resolver.getResolver({});

    expect(logger.error).toHaveBeenCalledWith(`Unable to locate certificates. (0)`);
    expect(logger.error).toHaveBeenCalledWith(
      'Please install the latest SKY UX CLI and run `skyux certs install`.'
    );
  });

  it('should require sslRoot path to exist', () => {
    const spyFsExtra = jasmine.createSpyObj('fs-extra', ['pathExistsSync']);
    mock('fs-extra', spyFsExtra);

    const resolver = mock.reRequire('../cli/utils/cert-resolver');

    spyFsExtra.pathExistsSync.and.returnValue(false);
    resolver.getResolver({ sslRoot: 'asdf' });

    expect(logger.error).toHaveBeenCalledWith(`Unable to locate certificates. (1)`);
    expect(logger.error).toHaveBeenCalledWith(
      'Please install the latest SKY UX CLI and run `skyux certs install`.'
    );
  });

  it('require the sslRoot path and log a message', () => {
    const spyFsExtra = jasmine.createSpyObj('fs-extra', ['pathExistsSync']);
    mock('fs-extra', spyFsExtra);

    const argv = { sslRoot: 'custom-ssl-root' };
    mock(argv.sslRoot, () => {});

    const resolver = mock.reRequire('../cli/utils/cert-resolver');

    spyFsExtra.pathExistsSync.and.returnValue(true);
    resolver.getResolver(argv);

    expect(logger.info).toHaveBeenCalledWith(`Located cert-resolver at ${argv.sslRoot}.`);
  });

});