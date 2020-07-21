const tsConfigUtil = require('../config/webpack/ts-loader-rule');

describe('Webpack TypeScript rule config', function () {

  it('should ingore diagnostics and disable type checking', () => {
    const loader = tsConfigUtil.getRule().use[0];
    expect(loader.options.transpileOnly).toEqual(true);
    expect(loader.options.ignoreDiagnostics).toEqual([2307]);
  });

});
