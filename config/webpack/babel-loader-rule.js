/**
 * Returns a Webpack rule that converts the provided package dependencies to ES5.
 * @param {*} dependenciesForTranspilation An array of package dependency names
 * that are not ES5 compatible.
 */
function getES5Rule(dependenciesForTranspilation = []) {

  // The following packages are provided by Webpack Dev Server and are
  // not compatible with our ES5 target.
  // See: https://github.com/blackbaud/skyux-sdk-builder/issues/220
  const webServerPackages = [
    'strip-ansi',
    'ansi-regex'
  ];

  const dependencies = [
    ...webServerPackages,
    ...dependenciesForTranspilation
  ];

  const pattern = String.raw`[\\\/](${dependencies.join('|')})[\\\/]`;
  const regex = new RegExp(pattern);

  return {
    test: regex,
    include: /node_modules/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-runtime']
      }
    }
  };
}

module.exports = {
  getES5Rule
};
