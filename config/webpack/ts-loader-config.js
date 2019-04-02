module.exports = {
  getConfig() {
    const awesomeTypescriptLoaderOptions = {
      forceIsolatedModules: true,
      // Ignore the "Cannot find module" error that occurs when referencing
      // an aliased file.  Webpack will still throw an error when a module
      // cannot be resolved via a file path or alias.
      ignoreDiagnostics: [
        2307
      ],
      reportFiles: [
        'src/app/**/*.ts'
      ],
      usePrecompiledFiles: true
    };

    return {
      test: /\.ts$/,
      use: (info) => {
        const isOutFile = (
          info.issuer &&
          info.issuer.match(/[\/\\]@skyux-sdk[\/\\]builder[\/\\]src[\/\\]/)
        );

        // Do not check types from other libraries, or Builder's src folder.
        if (isOutFile) {
          return [
            {
              loader: 'awesome-typescript-loader',
              options: Object.assign({}, awesomeTypescriptLoaderOptions, {
                transpileOnly: true,
                silent: true
              })
            },
            'angular2-template-loader'
          ];
        }

        // Use strict type checking on the SPA's source and specs.
        return [
          {
            loader: 'awesome-typescript-loader',
            options: awesomeTypescriptLoaderOptions
          },
          'angular2-template-loader'
        ];
      },
      exclude: [
        /\.e2e-spec\.ts$/
      ]
    };
  }
};
