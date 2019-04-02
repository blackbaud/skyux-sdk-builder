const tsConfigUtil = require('../config/webpack/ts-loader-config');

describe('Webpack TypeScript rule config', function () {

  it('should run type checking on SPA files', function () {
    const rule = tsConfigUtil.getConfig();
    const result = rule.use({
      issuer: 'src/app.component.ts'
    });

    expect(result[0].options.transpileOnly).toBeUndefined();
  });

  it('should not run type checking on Builder files', function () {
    const rule = tsConfigUtil.getConfig();
    const result = rule.use({
      issuer: '/@skyux-sdk/builder/src/app.component.ts'
    });

    expect(result[0].options.transpileOnly).toEqual(true);
  });
});
