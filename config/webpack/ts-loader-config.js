module.exports = {
  getConfig(command) {
    const options = {
      // Ignore the "Cannot find module" error that occurs when referencing
      // an aliased file. Webpack will still throw an error when a module
      // cannot be resolved via a file path or alias.
      ignoreDiagnostics: [
        2307
      ],

      // Only run type checking for these files.
      reportFiles: [
        'src/app/**/*.ts'
      ],

      forceIsolatedModules: true,
      usePrecompiledFiles: true
    };

    // Exclude test specs from type checking during a serve.
    if (command === 'serve') {
      options.reportFiles = [
        'src/app/**/!(*.spec).ts'
      ];
    }

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
              options: Object.assign({}, options, {
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
            options
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
