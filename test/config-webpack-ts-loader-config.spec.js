const tsConfigUtil = require('../config/webpack/ts-loader-rule');

describe('Webpack TypeScript rule config', function () {
  const spaFile = 'src/app.component.ts';
  const outFile = '/@skyux-sdk/builder/src/app.component.ts';

  function getAwesomeTypescriptLoader(filePath, command = 'test') {
    const rule = tsConfigUtil.getRule(command);
    const result = rule.use({
      issuer: filePath
    })[0];

    return result;
  }

  it('should run type checking on SPA files', function () {
    const loader = getAwesomeTypescriptLoader(spaFile);
    expect(loader.options.transpileOnly).toBeUndefined();
  });

  it('should not run type checking on Builder files', function () {
    const loader = getAwesomeTypescriptLoader(outFile);
    expect(loader.options.transpileOnly).toEqual(true);
  });

  it('should ignore test specs during `skyux serve`', function () {
    let loader = getAwesomeTypescriptLoader(outFile);
    expect(loader.options.reportFiles).toEqual([
      'src/app/**/*.ts'
    ]);

    loader = getAwesomeTypescriptLoader(outFile, 'serve');
    expect(loader.options.reportFiles).toEqual([
      'src/app/**/!(*.spec).ts'
    ]);
  });
});
