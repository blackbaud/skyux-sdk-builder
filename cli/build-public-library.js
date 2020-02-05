/*jshint node: true*/
'use strict';

const skyPagesConfigUtil = require('../config/sky-pages/sky-pages.config');
const ngPackage = require('ng-packagr');

// const tsConfig = {
//   compilerOptions: {
//     target: 'es5',
//     module: 'es2015',
//     moduleResolution: 'node',
//     emitDecoratorMetadata: true,
//     experimentalDecorators: true,
//     allowSyntheticDefaultImports: true,
//     sourceMap: true,
//     importHelpers: true,
//     noEmitHelpers: true,
//     noImplicitAny: true,
//     declaration: true,
//     skipLibCheck: true,
//     inlineSources: true,
//     'lib': [
//       'dom',
//       'es6'
//     ],
//     typeRoots: [
//       skyPagesConfigUtil.spaPath('node_modules', '@types')
//     ],
//     outDir: skyPagesConfigUtil.spaPath('dist'),
//     rootDir: skyPagesConfigUtil.spaPathTemp(),
//     baseUrl: '.',
//     paths: {
//       '@skyux-sdk/builder/*': [
//         '*'
//       ],
//       '.skypageslocales/*': [
//         '../src/assets/locales/*'
//       ]
//     }
//   },
//   files: getEntryPointFiles(),
//   exclude: [
//     'node_modules',
//     '**/*.spec.ts',
//     '**/*.e2e-spec.ts',
//     '**/*.pact-spec.ts'
//   ],
//   angularCompilerOptions: {
//     annotateForClosureCompiler: true,
//     fullTemplateTypeCheck: false,
//     skipTemplateCodegen: true,
//     strictMetadataEmit: true,
//     strictInjectionParameters: true,
//     enableResourceInlining: true
//   },
//   compileOnSave: false
// };

function runPackager() {
  const projectConfigPath = skyPagesConfigUtil.outPath('config/ng-packagr/ng-package.json');
  const tsConfig = {
    extends: skyPagesConfigUtil.spaPath('node_modules/ng-packagr/lib/ts/conf/tsconfig.ngc.json')
  };

  return ngPackage
    .ngPackagr()
    .forProject(projectConfigPath)
    .withTsConfig(tsConfig)
    .build();
}

async function buildPublicLibrary() {
  try {
    await runPackager();
    console.log('Package success.');
  } catch (error) {
    console.log('Package error:', error);
    process.exit(1);
  }
}

module.exports = buildPublicLibrary;
