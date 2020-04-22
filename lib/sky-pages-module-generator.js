/*jshint node: true*/
'use strict';

const logger = require('@blackbaud/skyux-logger');
const get = require('lodash.get');

const codegen = require('../utils/codegen-utils');

const assetsGenerator = require('./sky-pages-assets-generator');
const componentGenerator = require('./sky-pages-component-generator');

const defaultThemeStyleSheet = '@skyux/theme/css/sky.css';

function insertThemePaths(skyAppConfig, cssFilePaths) {
  const supportedThemes = get(skyAppConfig, 'skyux.app.theming.supportedThemes', []);

  const themeFilePaths = supportedThemes
    .filter(theme => theme !== 'default')
    .map(theme => `@skyux/theme/css/themes/${theme}/styles.css`);

  const defaultThemeIndex = cssFilePaths.indexOf(defaultThemeStyleSheet);

  cssFilePaths.splice(defaultThemeIndex + 1, 0, ...themeFilePaths);
}

/**
 * Generates the source necessary to register all routes + components.
 * Declared in order to satisfy jshint.
 * @name getSource
 * @returns {string} source
 */
function getSource(skyAppConfig) {
  const cssFilePaths = get(skyAppConfig, 'skyux.app.styles', []);

  // Add the default theme style sheet only if the consumer hasn't provided it.
  if (cssFilePaths.indexOf(defaultThemeStyleSheet) === -1) {
    cssFilePaths.unshift(defaultThemeStyleSheet);
  }

  insertThemePaths(skyAppConfig, cssFilePaths);

  let styles = '';
  let hasExternal = false;
  cssFilePaths.forEach((filePath) => {
    if (/^http/.test(filePath)) {
      hasExternal = true;
    } else {
      styles += `require('style-loader!${filePath}');\n`;
    }
  });

  if (hasExternal) {
    logger.warn([
      '[skyuxconfig.json] External style sheets are not permitted in the `app.styles` array.',
      'Consider using `app.externals`:\n',
      'https://developer.blackbaud.com/skyux/learn/reference/configuration'
    ].join(' '));
  }

  // Generate these first so we can check for 404 route
  const components = componentGenerator.getComponents(skyAppConfig);
  const componentNames = components.names;

  // Should we add the 404 route
  if (componentNames.indexOf('NotFoundComponent') === -1) {
    skyAppConfig.runtime.handle404 = true;
  }

  let runtimeImports = [
    'SkyAppBootstrapper'
  ];

  let runtimeProviders = [
    'SkyAppWindowRef',
    `{
      provide: SkyAppConfig,
      deps: [
        SkyAppWindowRef
      ],
      useFactory: SkyAppConfigFactory
    }`,
    `{
      provide: SkyAppAssetsService,
      useClass: ${assetsGenerator.getClassName()}
    }`,
    `{
      provide: SkyAppLocaleProvider,
      useClass: SkyAppHostLocaleProvider
    }`,
    `{
      provide: SkyViewkeeperHostOptions,
      deps: [
        SkyAppConfig
      ],
      useFactory: skyViewkeeperHostOptionsFactory
    }`
  ];

  let nodeModuleImports = [
    `import { NgModule } from '@angular/core';`,
    `import { CommonModule } from '@angular/common';`,
    `import { HttpModule } from '@angular/http';`,
    `import { FormsModule, ReactiveFormsModule } from '@angular/forms';`,
    `import { RouterModule } from '@angular/router';`,
    `import { SkyAppAssetsService } from '@skyux/assets';`,
    `import { SkyAppLocaleProvider } from '@skyux/i18n';`,
    `import { SkyAppRuntimeConfigParams, SkyAppConfig } from '@skyux/config';`,
    `import { SkyAppWindowRef } from '@skyux/core';`,
    `import { SkyAuthTokenProvider } from '@skyux/http';`,
    `import { SkyThemeModule } from '@skyux/theme';`,
    `import { SkyI18nModule } from '@skyux/i18n';`,
    `import { SkyAppTitleService, SkyViewkeeperHostOptions } from '@skyux/core';`
  ];

  let runtimeModuleExports = [];

  let runtimeModuleImports = [
    'CommonModule',
    'HttpModule',
    'FormsModule',
    'ReactiveFormsModule',
    'AppExtrasModule',
    'SkyI18nModule',
    'SkyThemeModule'
  ];

  let authTokenProvider = 'SkyAuthTokenProvider';

  if (skyAppConfig.runtime.command === 'pact') {
    nodeModuleImports.push(
      `import { SkyPactAuthTokenProvider, SkyPactService } from '@skyux-sdk/pact';`
    );
    runtimeProviders
      .push(`{
        provide: SkyPactService,
        useClass: SkyPactService,
        deps: [SkyAppConfig]
      }`);
    runtimeImports.push('SkyPactAuthTokenProvider');
    runtimeImports.push('SkyPactService');
    authTokenProvider = `{
      provide: SkyAuthTokenProvider,
      useClass: SkyPactAuthTokenProvider
    }`;
  }

  runtimeProviders.push(authTokenProvider);

  if (skyAppConfig.skyux.auth) {
    nodeModuleImports.push(`import { XHRBackend, RequestOptions } from '@angular/http';`);
    nodeModuleImports.push(`import { SkyAuthHttp } from '@skyux/http';`);
    runtimeProviders.push(`{
      provide: SkyAuthHttp,
      useClass: SkyAuthHttp,
      deps: [XHRBackend, RequestOptions, SkyAuthTokenProvider, SkyAppConfig]
    }`);
  }

  if (skyAppConfig.skyux.help) {
    nodeModuleImports.push(`import { BBHelpModule } from '@blackbaud/skyux-lib-help';`);
    runtimeModuleImports.push('BBHelpModule');
    runtimeModuleExports.push('BBHelpModule');
  }

  if (skyAppConfig.skyux.omnibar) {
    nodeModuleImports.push(`import {
  SkyAppOmnibarTitleService
} from '${skyAppConfig.runtime.runtimeAlias}/omnibar/omnibar-title.service';`);

    runtimeProviders.push(`{ provide: SkyAppTitleService, useClass: SkyAppOmnibarTitleService }`);
  } else {
    runtimeProviders.push('SkyAppTitleService');
  }

  const routingSource = [];

  if (skyAppConfig.runtime.includeRouteModule) {
    const routeGenerator = require('./sky-pages-route-generator');
    const routes = routeGenerator.getRoutes(skyAppConfig);
    skyAppConfig.runtime.routes = routes.routesForConfig;

    componentNames.push(...routes.names);

    nodeModuleImports.push(
      `import { Component, OnDestroy, OnInit } from '@angular/core';`,
      `import { ActivatedRoute, Routes } from '@angular/router';`,
      `import { Subscription } from 'rxjs';`
    );

    const useHashRouting = (skyAppConfig.skyux.useHashRouting === true);

    routingSource.push(
      ...routes.imports,
      routes.definitions,
      `const appRoutingProviders: any[] = [${routes.providers}]`,
      `const routes: Routes = ${routes.declarations};`,
      `const routing = RouterModule.forRoot(routes, { useHash: ${useHashRouting} });`
    );

    runtimeModuleImports.push('routing');
    runtimeProviders.push('appRoutingProviders');
  } else {
    /*
      Import the regular RouterModule so that tested components can reference things
      like routerLink
    */
    runtimeModuleImports.push('RouterModule');
  }

  let enableProdMode = ``;
  let useMockAuth = ``;

  switch (skyAppConfig.runtime.command) {
    case 'build':
      enableProdMode =
        `import { enableProdMode } from '@angular/core';
enableProdMode();`;
      break;

    case 'e2e':
      useMockAuth =
        `// Continue to set the mock flag here in case the consuming SPA still references
// the locally installed auth client library.
import { BBAuth } from '@blackbaud/auth-client';
BBAuth.mock = true;

import { BBAuthClientFactory } from '@skyux/auth-client-factory';
BBAuthClientFactory.BBAuth.mock = true;
`;
      break;
  }

  runtimeModuleExports.push(...componentNames);

  const skyAppConfigAsString = JSON.stringify(skyAppConfig);

  let moduleSource =
    `${useMockAuth}

${nodeModuleImports.join('\n')}

import '${skyAppConfig.runtime.skyPagesOutAlias}/src/main';

import {
  AppExtrasModule
} from '${skyAppConfig.runtime.skyPagesOutAlias}/src/app/app-extras.module';

import {
  ${runtimeImports.join(', ')}
} from '${skyAppConfig.runtime.runtimeAlias}';

import {
  SkyAppHostLocaleProvider
} from '${skyAppConfig.runtime.runtimeAlias}/i18n/host-locale-provider';

${assetsGenerator.getSource()}

export function SkyAppConfigFactory(windowRef: SkyAppWindowRef): any {
  const config: any = ${skyAppConfigAsString};
  config.runtime.params = new SkyAppRuntimeConfigParams(
    windowRef.nativeWindow.location.toString(),
    ${JSON.stringify(skyAppConfig.skyux.params)}
  );
  return config;
}

export function skyViewkeeperHostOptionsFactory(config: SkyAppConfig): SkyViewkeeperHostOptions {
  const omnibarExists = config.skyux.omnibar && config.runtime.params.get('addin') !== '1';

  const hostOptions = new SkyViewkeeperHostOptions();
  hostOptions.viewportMarginTop = omnibarExists ? 50 : 0;

  return hostOptions;
}

// Setting skyux config as static property exclusively for Bootstrapper
SkyAppBootstrapper.config = ${JSON.stringify(skyAppConfig.skyux)};

${components.imports}

${routingSource.join('\n')}

${enableProdMode}

${styles}

@NgModule({
  declarations: [
    ${componentNames.join(',\n' + codegen.indent(2))}
  ],
  imports: [
    ${runtimeModuleImports.join(',\n' + codegen.indent(2))}
  ],
  exports: [
    ${runtimeModuleExports.join(',\n' + codegen.indent(2))}
  ],
  providers: [
    ${runtimeProviders.join(',\n' + codegen.indent(2))}
  ]
}) export class SkyPagesModule { }`;

  return moduleSource;
}

module.exports = {
  getSource: getSource
};
