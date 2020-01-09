/*jshint jasmine: true, node: true */
'use strict';

const path = require('path');
const fs = require('fs-extra');
const mock = require('mock-require');

describe('utils/chromedriver-manager.js', () => {

  function spyOnChromeDriverVersionMatcher() {
    const spyChromeDriverVersionMatcher = jasmine.createSpyObj(
      'chromedriver-version-matcher',
      ['getChromeDriverVersion']
    );
    mock('chromedriver-version-matcher', spyChromeDriverVersionMatcher);
    return spyChromeDriverVersionMatcher;
  }

  function spyOnSpawn() {
    const spySpawn = jasmine.createSpyObj('spawn', ['sync']);
    mock('cross-spawn', spySpawn);
    return spySpawn;
  }

  function spyOnPath() {
    const spyPath = jasmine.createSpyObj('path', ['resolve']);
    mock('path', spyPath);
    return spyPath;
  }

  function getLib() {
    return mock.reRequire('../cli/utils/chromedriver-manager');
  }

  it('should expose a public API', () => {
    const lib = getLib();
    expect(lib.getVersion).toBeDefined();
    expect(lib.update).toBeDefined();
  });

  it('should call chromedriver-version-matcher and handle success with version', async () => {
    const version = '1.2.3';
    const spyChromeDriverVersionMatcher = spyOnChromeDriverVersionMatcher();

    spyChromeDriverVersionMatcher.getChromeDriverVersion.and.returnValue(Promise.resolve({
      chromeDriverVersion: version
    }));

    const lib = getLib();
    const result = await lib.getVersion();
    expect(result).toBe(version);
  });

  it('should call chromedriver-version-matcher and handle success without version', async () => {
    const spyChromeDriverVersionMatcher = spyOnChromeDriverVersionMatcher();
    spyChromeDriverVersionMatcher.getChromeDriverVersion.and.returnValue(Promise.resolve({}));

    const lib = getLib();
    const result = await lib.getVersion();
    expect(result).toBe('latest');
  });

  it('should call chromedriver-version-matcher and handle an error', async () => {
    const spyChromeDriverVersionMatcher = spyOnChromeDriverVersionMatcher();
    spyChromeDriverVersionMatcher.getChromeDriverVersion.and.returnValue(Promise.reject());

    const lib = getLib();
    const result = await lib.getVersion();
    expect(result).toBe('latest');
  });

  async function testUpdate(spawnResult) {
    const version = '4.5.6';
    const webdriverManagerPath = 'fake-path';

    const spyPath = spyOnPath();
    const spySpawn = spyOnSpawn();
    const spyChromeDriverVersionMatcher = spyOnChromeDriverVersionMatcher();

    spyPath.resolve.and.returnValue(webdriverManagerPath);
    spySpawn.sync.and.returnValue(spawnResult);
    spyChromeDriverVersionMatcher.getChromeDriverVersion.and.returnValue(Promise.resolve({
      chromeDriverVersion: version
    }));

    const lib = getLib();
    const result = await lib.update();

    expect(spyPath.resolve).toHaveBeenCalledWith(
      'node_modules',
      '.bin',
      'webdriver-manager'
    );

    expect(spySpawn.sync).toHaveBeenCalledWith(
      webdriverManagerPath,
      [
        'update',
        '--standalone',
        'false',
        '--gecko',
        'false',
        '--versions.chrome',
        version
      ],
      {
        stdio: 'inherit'
      }
    );

    return result;
  }

  it('should spawn webdriver-manager with the version and handle success', async () => {
    await testUpdate({});
  });

  it('should spawn webdriver-manager with the version and handle success', async () => {
    const error = 'spawn-error';
    let errorCaught;

    try {
      await testUpdate({ error });
    } catch (e) {
      errorCaught = e;
    }

    expect(errorCaught).toBe(error);
  });

});
