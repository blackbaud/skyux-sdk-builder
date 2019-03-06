/*jshint jasmine: true, node: true */
'use strict';

const tsLinter = require('../cli/utils/ts-linter');
const mock = require('mock-require');

describe('cli watch', () => {

  const specPattern = 'src/app/**/*.spec.ts';
  let karmaUtilsSpy;

  beforeEach(() => {
    spyOn(process, 'exit');

    karmaUtilsSpy = jasmine.createSpyObj('karmaUtils', ['run']);
    mock('../cli/utils/karma-utils', karmaUtilsSpy);
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should call process.exit with the exitCodes of karma', (done) => {
    const argv = { custom: true };
    const command = 'custom-command1';

    karmaUtilsSpy.run.and.returnValue({
      then: cb => {
        cb(1);

        expect(karmaUtilsSpy.run.calls.argsFor(0)[1].command).toBe(command);
        expect(karmaUtilsSpy.run).toHaveBeenCalledWith(
          command,
          argv,
          specPattern
        );
        expect(process.exit).toHaveBeenCalledWith(1);
        done();
      }
    });

    const test = mock.reRequire('../cli/watch');
    test(command, argv);
  });

  it('should use process.argv if no arguments passed in', (done) => {
    const argvClean = process.argv;
    const argv = { process: true };
    const command = 'custom-command2';

    karmaUtilsSpy.run.and.returnValue({
      then: cb => {
        cb(0);
        expect(karmaUtilsSpy.run).toHaveBeenCalledWith(
          command,
          argv,
          specPattern
        );
        expect(process.exit).toHaveBeenCalledWith(0);
        done();
      }
    });

    process.argv = argv;
    const test = mock.reRequire('../cli/watch');

    test(command);
    process.argv = argvClean;
  });
});
