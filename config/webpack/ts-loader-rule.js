/**
 * Returns a webpack loader rule to handle TypeScript files.
 */
function getRule() {
  return {
    test: /\.ts$/,
    use: [
      {
        loader: '@ngtools/webpack',
        options: {}
      },
      'angular2-template-loader'
    ],
    exclude: [
      /\.e2e-spec\.ts$/
    ]
  };
}

module.exports = {
  getRule
};
