import {
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  Optional,
  Renderer2
} from '@angular/core';

import {
  NavigationEnd,
  Router
} from '@angular/router';

import {
  NextObserver,
  Subject
} from 'rxjs';

import {
  takeUntil
} from 'rxjs/operators';

import {
  BBOmnibarNavigation,
  BBOmnibarNavigationItem,
  BBOmnibarSearchArgs
} from '@blackbaud/auth-client';

import {
  HelpInitializationService
} from '@blackbaud/skyux-lib-help';

import {
  SkyAppConfig,
  SkyuxConfigAppSupportedTheme
} from '@skyux/config';

import {
  SkyAppWindowRef
} from '@skyux/core';

import {
  SkyAppOmnibarProvider,
  SkyAppOmnibarReadyArgs,
  SkyAppSearchResultsProvider
} from '@skyux/omnibar-interop';

import {
  SkyAppStyleLoader,
  SkyAppViewportService,
  SkyTheme,
  SkyThemeMode,
  SkyThemeService,
  SkyThemeSettings
} from '@skyux/theme';

import {
  BBAuthClientFactory
} from '@skyux/auth-client-factory';

require('style-loader!./app.component.scss');

type SupportedThemeInfoItem = {
  settings: SkyThemeSettings,
  suffix?: string,
  hidden?: boolean
};

type SkyuxHost = {
  setupThemeSwitcher: (
    supportedThemeInfo: SupportedThemeInfoItem[],
    callback: (settings: SkyThemeSettings) => void,
    themeSwitcherUpdates: NextObserver<SkyThemeSettings>
  ) => void

  theming: {
    serviceIdMap: {
      [key: string]: SkyuxConfigAppSupportedTheme
    }
  }

  help: {
    helpMode?: 'legacy' | 'menu'
  }
};

let omnibarLoaded = false;

function fixUpUrl(baseUrl: string, route: string, config: SkyAppConfig) {
  return config.runtime.params.getUrl(baseUrl + route);
}

function fixUpNavItems(items: any[], baseUrl: string, config: SkyAppConfig) {
  for (const item of items) {
    if (!item.url && item.route) {
      item.url = fixUpUrl(baseUrl, item.route, config);
    }

    if (item.items) {
      fixUpNavItems(item.items, baseUrl, config);
    }
  }
}

function fixUpNav(nav: any, baseUrl: string, config: SkyAppConfig) {
  const services = nav.services;

  if (services && services.length > 0) {
    let foundSelectedService = false;

    for (const service of services) {
      if (service.items) {
        fixUpNavItems(service.items, baseUrl, config);
      }

      if (service.selected) {
        foundSelectedService = true;
      }
    }

    if (!foundSelectedService) {
      services[0].selected = true;
    }
  }
}

@Component({
  selector: 'sky-pages-app',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  public isReady = false;

  private ngUnsubscribe = new Subject<any>();

  private skyuxHost: SkyuxHost | undefined;

  constructor(
    private router: Router,
    private windowRef: SkyAppWindowRef,
    private config: SkyAppConfig,
    private styleLoader: SkyAppStyleLoader,
    @Optional() private helpInitService?: HelpInitializationService,
    @Optional() private searchProvider?: SkyAppSearchResultsProvider,
    @Optional() viewport?: SkyAppViewportService,
    @Optional() private zone?: NgZone,
    @Optional() private omnibarProvider?: SkyAppOmnibarProvider,
    @Optional() renderer?: Renderer2,
    @Optional() private themeSvc?: SkyThemeService
  ) {
    // Defined globally by the SKY UX Host service.
    this.skyuxHost = this.windowRef.nativeWindow.SKYUX_HOST;

    /* istanbul ignore else */
    if (this.themeSvc) {
      const themeSettings = this.getInitialThemeSettings();

      this.themeSvc.init(
        document.body,
        renderer as Renderer2,
        themeSettings
      );

      // const skyuxHost = this.windowRef.nativeWindow.SKYUX_HOST;
      const setupThemeSwitcher = this.skyuxHost?.setupThemeSwitcher;
      if (setupThemeSwitcher) {
        const appConfig = this.config.skyux.app;
        const themingConfig = appConfig && appConfig.theming;

        if (themingConfig && themingConfig.supportedThemes.indexOf('modern') >= 0) {
          const supportedThemeInfo: {
            settings: SkyThemeSettings,
            suffix?: string,
            hidden?: boolean
          }[] = [{
            settings: new SkyThemeSettings(
              SkyTheme.presets.modern,
              SkyThemeMode.presets.light
            )
          }, {
            settings: new SkyThemeSettings(
              SkyTheme.presets.modern,
              SkyThemeMode.presets.dark
            ),
            suffix: ' - dark (experimental)',
            hidden: true
          }];

          if (themingConfig.supportedThemes.indexOf('default') >= 0) {
            supportedThemeInfo.splice(
              themeSettings.theme.name === 'default' ? 0 : supportedThemeInfo.length,
              0,
              {
                settings: new SkyThemeSettings(
                  SkyTheme.presets.default,
                  SkyThemeMode.presets.light
                )
              }
            );
          }

          let themeSwitcherUpdates: NextObserver<SkyThemeSettings> = {
            next: () => {}
          };

          setupThemeSwitcher(supportedThemeInfo, (settings: SkyThemeSettings) => {
            this.themeSvc!.setTheme(settings);
          }, themeSwitcherUpdates);

          this.themeSvc!.settingsChange.subscribe((value) => {
            themeSwitcherUpdates.next(value.currentSettings);
          });
        }
      }
    }

    this.styleLoader.loadStyles()
      .then((result?: any) => {
        this.isReady = true;

        if (result && result.error) {
          console.log(result.error.message);
        }

        // Let the isReady property take effect on the CSS class that hides/shows
        // content based on when styles are loaded.
        setTimeout(() => {
          viewport!.visible.next(true);
        });
      });
  }

  public ngOnInit() {

    // Without this code, navigating to a new route doesn't cause the window to be
    // scrolled to the top like the browser does automatically with non-SPA navigation
    // when no route fragment is present.
    this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationEnd) {
        const urlTree = this.router.parseUrl(event.url);
        if (!urlTree.fragment) {
          this.windowRef.nativeWindow.scroll(0, 0);
        }
      }
    });
    this.initShellComponents();
  }

  public ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    if (omnibarLoaded) {
      BBAuthClientFactory.BBOmnibar.destroy();
      omnibarLoaded = false;
    }

    /* istanbul ignore else */
    if (this.themeSvc) {
      this.themeSvc.destroy();
    }
  }

  // Only pass params that omnibar config cares about
  // Internally we store as envid/svcid but auth-client wants envId/svcId
  private setParamsFromQS(omnibarConfig: any) {
    const map: { [key: string]: string } = {
      envid: 'envId',
      leid: 'leId',
      svcid: 'svcId'
    };

    Object.keys(map).forEach((key: string) => {
      if (this.config.runtime.params.has(key)) {
        omnibarConfig[map[key]] = this.config.runtime.params.get(key);
      }
    });
  }

  private setOnSearch(omnibarConfig: any) {
    if (this.searchProvider) {
      omnibarConfig.onSearch = (searchArgs: BBOmnibarSearchArgs) => {
        return this.searchProvider!.getSearchResults(searchArgs);
      };
    }
  }

  private setNav(omnibarConfig: any) {
    const skyuxConfig = this.config.skyux;

    const baseUrl =
      (
        skyuxConfig.host!.url +
        this.config.runtime.app.base.substr(0, this.config.runtime.app.base.length - 1)
      ).toLowerCase();

    let nav: BBOmnibarNavigation;

    if (omnibarConfig.nav) {
      nav = omnibarConfig.nav;
      fixUpNav(nav, baseUrl, this.config);
    } else {
      nav = omnibarConfig.nav = {};
    }

    nav.beforeNavCallback = (item: BBOmnibarNavigationItem) => {
      const url = item.url!.toLowerCase();

      if (
        url === baseUrl ||
        // Make sure the base URL is not simply a partial match of the base URL plus additional
        // characters after the base URL that are not "terminating" characters
        url.indexOf(baseUrl + '/') === 0 ||
        url.indexOf(baseUrl + '?') === 0
      ) {
        const routePath = item.url!.substring(baseUrl.length, url.length);

        // Since the omnibar is loaded outside Angular, navigating needs to be explicitly
        // run inside the Angular zone in order for navigation to work properly.
        this.zone!.run(() => {
          this.router.navigateByUrl(routePath);
        });

        return false;
      }

      return true;
    };

    if (this.config.runtime.command === 'serve') {
      // Add any global routes to the omnibar as a convenience to the developer.
      const globalRoutes =
        skyuxConfig.routes &&
        skyuxConfig.routes.public &&
        skyuxConfig.routes.public.filter((value: any) => {
          return value.global;
        });

      if (globalRoutes) {
        const localNavItems: BBOmnibarNavigationItem[] = [];

        for (const route of globalRoutes) {
          localNavItems.push({
            title: route.name,
            url: fixUpUrl(baseUrl, route.route, this.config),
            data: route
          });
        }

        nav.localNavItems = localNavItems;
      }
    }
  }

  private setOmnibarArgsOverrides(omnibarConfig: any, args?: SkyAppOmnibarReadyArgs) {
    if (args) {
      // Eventually this could be expanded to allow any valid config property to be overridden,
      // but for now keep it scoped to the two parameters we know consumers will want to override.
      if (args.hasOwnProperty('envId')) {
        omnibarConfig.envId = args.envId;
      }

      if (args.hasOwnProperty('svcId')) {
        omnibarConfig.svcId = args.svcId;
      }
    }
  }

  private async initShellComponents(): Promise<void> {
    const omnibarConfig = this.config.skyux.omnibar;
    const helpConfig = this.config.skyux.help;

    let pendingHelpUrl: string;

    const updateOmnibarHelpUrl = (helpUrl: string) => {
      BBAuthClientFactory.BBOmnibar.update({
        help: {
          url: helpUrl
        }
      });
    };

    const loadHelp = () => {
      if (helpConfig && this.helpInitService) {
        const helpMode = this.skyuxHost?.help?.helpMode;

        if (helpMode) {
          helpConfig.helpMode = helpMode;
        }

        helpConfig.helpUpdateCallback = (args: { url: string }) => {
          if (omnibarConfig) {
            if (!omnibarLoaded) {
              pendingHelpUrl = args.url;
            } else {
              updateOmnibarHelpUrl(args.url);
            }
          }
        };

        this.helpInitService.load(helpConfig);
      }
    };

    const loadOmnibar = (args?: SkyAppOmnibarReadyArgs) => {
      this.setParamsFromQS(omnibarConfig);
      this.setNav(omnibarConfig);
      this.setOnSearch(omnibarConfig);

      if (helpConfig) {
        omnibarConfig.enableHelp = true;
      }

      if (this.config.skyux.auth) {
        omnibarConfig.allowAnonymous = false;
      } else if (omnibarConfig.allowAnonymous === undefined) {
        // Allow the consumer to set `allowAnonymous` if `auth` is false
        // to enable custom auth logic while still taking advantage of
        // omnibar features like signing out due to inactivity.
        omnibarConfig.allowAnonymous = true;
      }

      this.setOmnibarArgsOverrides(omnibarConfig, args);

      const initialThemeSettings = this.getInitialThemeSettings();

      if (initialThemeSettings.theme !== SkyTheme.presets.default) {
        omnibarConfig.theme = {
          mode: initialThemeSettings.mode.name,
          name: initialThemeSettings.theme.name
        };
      }

      // The omnibar uses setInterval() to poll for user activity, and setInterval()
      // triggers change detection on each interval.  Loading the omnibar outside
      // Angular will keep change detection from being triggered during each interval.
      this.zone!.runOutsideAngular(() => {
        BBAuthClientFactory.BBOmnibar.load(omnibarConfig).then(() => {
          if (pendingHelpUrl) {
            updateOmnibarHelpUrl(pendingHelpUrl);
          }

          /* istanbul ignore else */
          if (this.themeSvc) {
            this.themeSvc.settingsChange
              .pipe(
                takeUntil(this.ngUnsubscribe)
              )
              .subscribe((settings) => {
                const currentSettings = settings.currentSettings;

                BBAuthClientFactory.BBOmnibar.update({
                  theme: {
                    mode: currentSettings.mode.name,
                    name: currentSettings.theme.name
                  }
                });
              });
          }

          omnibarLoaded = true;
        });
      });
    };

    if (this.config.runtime.command === 'e2e') {
      this.windowRef.nativeWindow.addEventListener('message', (event: MessageEvent) => {
        if (event.data.messageType === 'sky-navigate-e2e') {
          this.router.navigate(event.data.url);
        }
      });
    }

    if (this.config.runtime.params.get('addin') !== '1') {
      loadHelp();

      if (omnibarConfig) {
        if (this.omnibarProvider) {
          this.omnibarProvider.ready().then(loadOmnibar);
        } else {
          loadOmnibar();
        }
      }
    }
  }

  private getInitialThemeSettings(): SkyThemeSettings {
    return new SkyThemeSettings(
      SkyTheme.presets[this.getInitialThemeName()],
      SkyThemeMode.presets.light
    );
  }

  private getInitialThemeName(): SkyuxConfigAppSupportedTheme {
    const appConfig = this.config.skyux.app;
    const themingConfig = appConfig && appConfig.theming;

    if (themingConfig) {
      const svcId = this.config.runtime.params.get('svcid');

      if (svcId) {
        const svcIdMap = this.skyuxHost?.theming?.serviceIdMap;

        if (svcIdMap) {
          const mappedTheme = svcIdMap[svcId];

          if (mappedTheme && themingConfig.supportedThemes.indexOf(mappedTheme) >= 0) {
            return mappedTheme;
          }
        }
      }

      return themingConfig.theme;
    }

    return 'default';
  }
}
