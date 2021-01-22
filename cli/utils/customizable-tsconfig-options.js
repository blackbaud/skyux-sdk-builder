/**
 * The allowed Typescript compiler options for consumers to override.
 * [Typescript Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
 */
const CUSTOMIZABLE_TSCONFIG_COMPILER_OPTIONS = [
  'esModuleInterop',
  'allowSyntheticDefaultImports',
  // Typescript Strict Mode enables the following flags
  'strict',
  'noImplicitAny',
  'noImplicitThis',
  'alwaysStrict',
  'strictBindCallApply',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictPropertyInitialization',
  // Other recommended TS options
  'forceConsistentCasingInFileNames',
  'noImplicitReturns',
  'noFallthroughCasesInSwitch',
  'noUnusedLocals',
  'noUnusedParameters'
];

/**
 * The allowed Angular compiler options for consumers to override.
 * [Angular Compiler Options](https://angular.io/guide/angular-compiler-options#angular-compiler-options)
 */
const CUSTOMIZABLE_ANGULAR_COMPILER_OPTIONS = [
  'fullTemplateTypeCheck',
  // Angular Strict Mode - https://angular.io/guide/template-typecheck
  'strictTemplates',
  'strictInputTypes',
  'strictInputAccessModifiers',
  'strictNullInputTypes',
  'strictAttributeTypes',
  'strictSafeNavigationTypes',
  'strictDomLocalRefTypes',
  'strictOutputEventTypes',
  'strictDomEventTypes',
  'strictContextGenerics',
  'strictLiteralTypes',
];

module.exports = {
  CUSTOMIZABLE_TSCONFIG_COMPILER_OPTIONS,
  CUSTOMIZABLE_ANGULAR_COMPILER_OPTIONS
};
