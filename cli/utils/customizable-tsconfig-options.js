/**
 * The allowed Typescript compiler options for consumers to override.
 * [Typescript Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
 */
const CUSTOMIZABLE_TYPESCRIPT_COMPILER_OPTIONS = [
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

/**
 * Applies allowed Typescript Compiler Options to the build's TSConfig
 * @param {Object} config The tsconfig.json JSON contents.
 * @param {Object} spaTsConfig The consumer's TS Config
 */
function applyTypescriptCompilerOptions(config, spaTsConfig) {
  /* istanbul ignore if */
  if (hasTypescriptCompilerOptions(spaTsConfig)) {
    config.compilerOptions = config.compilerOptions || {};
  }

  CUSTOMIZABLE_TYPESCRIPT_COMPILER_OPTIONS.forEach(key => {
    if (
      spaTsConfig &&
      spaTsConfig.compilerOptions &&
      spaTsConfig.compilerOptions[key] !== undefined
    ) {
      config.compilerOptions[key] = spaTsConfig.compilerOptions[key];
    }
  });

  return config;
}

/**
 * Applies allowed Angular Compiler Options to the build's TSConfig
 * @param {Object} config The tsconfig.json JSON contents.
 * @param {Object} spaTsConfig The consumer's TS Config
 */
function applyAngularCompilerOptions(config, spaTsConfig) {
  if (hasAngularCompilerOptions(spaTsConfig)) {
    config.angularCompilerOptions = config.angularCompilerOptions || {};
  }

  CUSTOMIZABLE_ANGULAR_COMPILER_OPTIONS.forEach(key => {
    if (
      spaTsConfig &&
      spaTsConfig.angularCompilerOptions &&
      spaTsConfig.angularCompilerOptions[key] !== undefined
    ) {
      config.angularCompilerOptions[key] = spaTsConfig.angularCompilerOptions[key];
    }
  });

  return config;
}

function hasTypescriptCompilerOptions(spaTsConfig) {
  return hasCompilerOptions(spaTsConfig, 'compilerOptions', CUSTOMIZABLE_ANGULAR_COMPILER_OPTIONS);
}

function hasAngularCompilerOptions(spaTsConfig) {
  return hasCompilerOptions(
    spaTsConfig,
    'angularCompilerOptions',
    CUSTOMIZABLE_ANGULAR_COMPILER_OPTIONS
  );
}

/**
 * Checks if any valid keys have been overwritten.
 * @param {object} spaTsConfig Consumer's TS Config
 * @param {string} compilerObjKey Field that holds the compiler options.
 * @param {Array<string>} customizableKeys array of customizable keys.
 */
function hasCompilerOptions(spaTsConfig, compilerObjKey, customizableKeys) {
  const configIsDefined = spaTsConfig && spaTsConfig[compilerObjKey];
  if (!configIsDefined) {
    return false;
  }

  for (let i = 0; i < customizableKeys.length; i++) {
    const key = customizableKeys[i];
    if (key in spaTsConfig[compilerObjKey]) {
      return true;
    }
  }

  return false;
}


module.exports = {
  applyTypescriptCompilerOptions,
  applyAngularCompilerOptions
};
