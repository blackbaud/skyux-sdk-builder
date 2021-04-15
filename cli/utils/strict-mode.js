const fs = require('fs-extra');
const merge = require('../../utils/merge');
const skyPagesConfigUtil = require('../../config/sky-pages/sky-pages.config');

function applyStrictModeConfig(tsConfig) {
  const spaTsConfig = fs.readJsonSync(skyPagesConfigUtil.spaPath('tsconfig.json'));

  // Add "strict" configuration if relevant.
  if (spaTsConfig.extends.includes('tsconfig.strict')) {
    const strictConfig = fs.readJsonSync(
      skyPagesConfigUtil.outPath('tsconfig.strict.json')
    );

    // Remove the "extends" property to avoid an infinite lookup.
    delete strictConfig.extends;

    tsConfig = merge(tsConfig, strictConfig);
  }

  return tsConfig;
}

module.exports = {
  applyStrictModeConfig
};
