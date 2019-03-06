/*jshint jasmine: true, node: true */
'use strict';

const mock = require('mock-require');

describe('cli test', () => {

  const specPattern = 'src/app/**/*.spec.ts';

  it('should pass command, argv, and specPattern to karmaUtils.run', () => {
    const argv = { custom: true };
    const command = 'custom-command1';

    const karmaUtilsSpy = jasmine.createSpyObj('karmaUtils', ['run']);
    mock('../cli/utils/karma-utils', karmaUtilsSpy);

    const test = mock.reRequire('../cli/test');
    test(command, argv);

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
    const karmaUtilsSpy = jasmine.createSpyObj('karmaUtils', ['run']);

    process.argv = argv;
    mock('../cli/utils/karma-utils', karmaUtilsSpy);

    const test = mock.reRequire('../cli/test');
    test(command);
    expect(karmaUtilsSpy.run).toHaveBeenCalledWith(
      command,
      argv,
      specPattern
    );

    process.argv = argvClean;
  });
});
