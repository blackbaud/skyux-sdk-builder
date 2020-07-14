/**
 * Returns a webpack loader rule to handle TypeScript files.
 */
function getRule() {
  return {
    test: /\.ts$/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          // Ignore the "Cannot find module" error that occurs when referencing
          // an aliased file.  Webpack will still throw an error when a module
          // cannot be resolved via a file path or alias.
          ignoreDiagnostics: [2307],
          transpileOnly: true
        }
      },
      'angular2-template-loader'
    ],
    exclude: [
      /node_modules/,
      /\.e2e-spec\.ts$/
    ]
  };
}

module.exports = {
  getRule
};
