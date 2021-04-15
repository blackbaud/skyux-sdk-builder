const mock = require('mock-require');

describe('strict mode util', () => {

  let mockSpaTsConfig;

  beforeEach(() => {

    mockSpaTsConfig = {
      extends: ''
    };

    mock('fs-extra', {
      readJsonSync(fileName) {
        if (fileName.endsWith('tsconfig.json')) {
          return mockSpaTsConfig;
        }

        if (fileName.endsWith('tsconfig.strict.json')) {
          return {
            compilerOptions: {
              strict: true
            }
          };
        }
      }
    });
  });

  afterEach(() => {
    mock.stopAll();
  });

  it('should apply strict mode config if requested', () => {
    const util = mock.reRequire('../cli/utils/strict-mode');

    mockSpaTsConfig = {
      extends: 'tsconfig.strict'
    };

    const result = util.applyStrictModeConfig({
      compilerOptions: {
        target: 'es5'
      }
    });

    expect(result.compilerOptions).toEqual({
      strict: true,
      target: 'es5'
    });
  });

  it('should not apply strict mode config by default', () => {
    const util = mock.reRequire('../cli/utils/strict-mode');

    mockSpaTsConfig = {
      extends: 'tsconfig'
    };

    const result = util.applyStrictModeConfig({
      compilerOptions: {
        target: 'es5'
      }
    });

    expect(result.compilerOptions).toEqual({
      target: 'es5'
    });
  });

});
