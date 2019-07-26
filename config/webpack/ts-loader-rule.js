/**
 * Returns a webpack loader rule to handle TypeScript files.
 * @param {string} command The active CLI command
 */
function getRule(command) {

  // See full documentation:
  // https://github.com/s-panferov/awesome-typescript-loader#loader-options
  const awesomeTypescriptLoaderOptions = {

    // Ignore the "Cannot find module" error that occurs when referencing
    // an aliased file. Webpack will still throw an error when a module
    // cannot be resolved via a file path or alias.
    ignoreDiagnostics: [
      2307
    ],

    // Only run type checking for these files.
    reportFiles: [
      'src/app/**/*.ts'
    ]
  };

  if (command === 'serve') {

    // Exclude test specs from type checking during a serve.
    awesomeTypescriptLoaderOptions.reportFiles = [
      'src/app/**/!(*.spec|*.fixture).ts'
    ];

    // Report TS build errors as warnings to allow the
    // application to recompile during a serve.
    awesomeTypescriptLoaderOptions.errorsAsWarnings = true;
  }

  // These loaders will be used for files that require type checking.
  const typeCheckingLoaders = [
    {
      loader: 'awesome-typescript-loader',
      options: awesomeTypescriptLoaderOptions
    },
    'angular2-template-loader'
  ];

  // These loaders will be used for files that do not require type checking.
  const transpileOnlyLoaders = [
    {
      loader: 'awesome-typescript-loader',
      options: Object.assign({}, awesomeTypescriptLoaderOptions, {
        transpileOnly: true,
        silent: true
      })
    },
    'angular2-template-loader'
  ];

  return {
    test: /\.ts$/,

    use: (info) => {
      const outFileRegExp = /node_modules/;

      const isOutFile = (
        info.issuer &&
        info.issuer.match(outFileRegExp)
      );

      // Do not check types from other libraries, or Builder's src folder.
      if (isOutFile) {
        return transpileOnlyLoaders;
      }

      // Use strict type checking on the SPA's source and specs.
      return typeCheckingLoaders;
    },

    exclude: [
      /\.e2e-spec\.ts$/
    ]
  };
}

module.exports = {
  getRule
};
