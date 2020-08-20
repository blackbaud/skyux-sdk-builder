import {
  NgZone,
  Renderer2,
  Type
} from '@angular/core';

import {
  async,
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';

import {
  NavigationEnd,
  NavigationStart,
  Router
} from '@angular/router';

import {
  RouterTestingModule
} from '@angular/router/testing';

import {
  BehaviorSubject
} from 'rxjs';

import {
  BBOmnibar,
  BBOmnibarConfig,
  BBOmnibarNavigationItem,
  BBOmnibarSearchArgs
} from '@blackbaud/auth-client';

import {
  HelpInitializationService
} from '@blackbaud/skyux-lib-help';

import {
  SkyAppConfig
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
  AppComponent
} from './app.component';

describe('AppComponent', () => {
  let mockThemeSvc: any;
  let mockWindow: any;
  let comp: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let searchArgs: BBOmnibarSearchArgs;
  let navigateParams: any;
  let navigateByUrlParams: any;
  let subscribeHandler: any;
  let scrollCalled: boolean = false;
  let skyAppConfig: any;
  let viewport: SkyAppViewportService;
  let spyOmnibarDestroy: jasmine.Spy;
  let spyOmnibarUpdate: jasmine.Spy;
  let defaultThemeSettings: SkyThemeSettings;
  let spyOmnibarLoad: jasmine.Spy;

  class MockHelpInitService {
    public load(config: any) { }
  }

  class MockWindow {
    public nativeWindow = {
      location: {
        href: ''
      },
      SKYUX_HOST: undefined as any,
      scroll: () => scrollCalled = true,
      addEventListener: () => {}
    };
  }

  const mockHelpInitService = new MockHelpInitService();

  function setup(
    config: any,
    includeSearchProvider?: boolean,
    styleLoadPromise?: Promise<any>,
    omnibarProvider?: any,
    mockSkyuxHost?: any
  ) {
    mockWindow = new MockWindow();
    mockWindow.nativeWindow.SKYUX_HOST = mockSkyuxHost;

    defaultThemeSettings = new SkyThemeSettings(
      SkyTheme.presets.default,
      SkyThemeMode.presets.light
    );

    mockThemeSvc = {
      init: jasmine.createSpy('init'),
      destroy: jasmine.createSpy('destroy'),
      settingsChange: new BehaviorSubject<any>({
        previousSettings: undefined,
        currentSettings: defaultThemeSettings
      })
    };

    const providers: any[] = [
      {
        provide: Router,
        useValue: {
          events: {
            subscribe: (handler: any) => subscribeHandler = handler
          },
          navigate: (params: any) => navigateParams = params,
          navigateByUrl: (url: string) => navigateByUrlParams = url,
          parseUrl: (url: string) => {
            return {
              fragment: (url === '') ? undefined : 'scroll-here'
            };
          }
        }
      },
      {
        provide: SkyAppWindowRef,
        useValue: mockWindow
      },
      {
        provide: SkyAppConfig,
        useValue: config
      },
      {
        provide: SkyAppStyleLoader,
        useValue: {
          loadStyles: () => styleLoadPromise || Promise.resolve()
        }
      },
      {
        provide: HelpInitializationService,
        useValue: mockHelpInitService
      },
      {
        provide: SkyAppViewportService,
        useValue: viewport
      }
    ];

    if (includeSearchProvider) {
      providers.push({
        provide: SkyAppSearchResultsProvider,
        useValue: {
          getSearchResults: (sa: any) => searchArgs = sa
        }
      });
    }

    if (omnibarProvider) {
      providers.push({
        provide: SkyAppOmnibarProvider,
        useValue: omnibarProvider
      });
    }

    return TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      imports: [
        RouterTestingModule
      ],
      providers: providers
    })
      .overrideComponent(
        AppComponent,
        {
          set: {
            providers: [
              {
                provide: SkyThemeService,
                useValue: mockThemeSvc
              }
            ]
          }
        }
      )
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AppComponent);
        comp = fixture.componentInstance;
      });
  }

  function validateOmnibarProvider(
    readyArgs: SkyAppOmnibarReadyArgs,
    expectedNotCalledWith?: any
  ) {
    skyAppConfig.skyux.omnibar = {};

    let readyPromiseResolve: (args: SkyAppOmnibarReadyArgs) => void;

    const readyPromise = new Promise<SkyAppOmnibarReadyArgs>((resolve) => {
      readyPromiseResolve = resolve;
    });

    setup(skyAppConfig, undefined, undefined, {
      ready: () => readyPromise
    }).then(() => {
      fixture.detectChanges();

      expect(spyOmnibarLoad).not.toHaveBeenCalled();

      readyPromiseResolve(readyArgs);

      tick();

      expect(spyOmnibarLoad).toHaveBeenCalledWith(jasmine.objectContaining(readyArgs));

      if (expectedNotCalledWith) {
        expect(spyOmnibarLoad).not.toHaveBeenCalledWith(
          jasmine.objectContaining(expectedNotCalledWith)
        );
      }
    });
  }

  function validateThemeInit(expectedTheme: SkyTheme, expectedMode: SkyThemeMode): void {
    const renderer2 = fixture.componentRef.injector.get<Renderer2>(
      Renderer2 as Type<Renderer2>
    );

    expect(mockThemeSvc.init).toHaveBeenCalledWith(
      document.body,
      renderer2,
      new SkyThemeSettings(
        expectedTheme,
        expectedMode
      )
    );
  }

  // Reset skyAppConfig and scrollCalled
  beforeEach(() => {
    skyAppConfig = {
      runtime: {
        app: {
          base: 'app-base'
        },
        params: {
          get: (key: any) => false,
          has: (key: any) => false,
          hasAllRequiredParams: () => true,
          parse: (p: any) => p
        }
      },
      skyux: {
        host: {
          url: 'host-url'
        }
      }
    };
    scrollCalled = false;
    viewport = new SkyAppViewportService();
    navigateParams = undefined;
    navigateByUrlParams = undefined;
    spyOmnibarDestroy = spyOn(BBOmnibar, 'destroy');
    spyOmnibarUpdate = spyOn(BBOmnibar, 'update');
    spyOmnibarLoad = spyOn(BBOmnibar, 'load').and.returnValue(Promise.resolve());
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create component', async(() => {
    setup(skyAppConfig).then(() => {
      expect(comp).toBeDefined();
    });
  }));

  it('should subscribe to router events and call scroll on NavigationEnd', async(() => {
    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      subscribeHandler(new NavigationStart(0, ''));
      expect(scrollCalled).toBe(false);

      subscribeHandler(new NavigationEnd(0, '', ''));
      expect(scrollCalled).toBe(true);
    });
  }));

  it('should not call scroll on NavigationEnd when a url fragment is present', async(() => {
    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      subscribeHandler(new NavigationEnd(0, '/#scroll-here', '/#scroll-here'));
      expect(scrollCalled).toBe(false);
    });
  }));

  it('should not call BBOmnibar.load if config.skyux.omnibar does not exist', async(() => {
    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      fixture.destroy();
      expect(spyOmnibarLoad).not.toHaveBeenCalled();
      expect(spyOmnibarDestroy).not.toHaveBeenCalled();
    });
  }));

  it(
    'should load the omnibar outside Angular to avoid change detection during user activity checks',
    async(() => {
      skyAppConfig.skyux.omnibar = {};

      setup(skyAppConfig).then(() => {
        const zone = fixture.debugElement.injector.get(NgZone);

        let loadOmnibarCallback: Function;

        const runOutsideAngularSpy = spyOn(zone, 'runOutsideAngular').and.callFake(
          (cb: Function): any => {
            if (cb && cb.toString().indexOf('BBOmnibar') >= 0) {
              loadOmnibarCallback = cb;
            } else {
              cb();
            }
          }
        );

        fixture.detectChanges();

        expect(runOutsideAngularSpy).toHaveBeenCalled();
        expect(spyOmnibarLoad).not.toHaveBeenCalled();

        loadOmnibarCallback();

        expect(spyOmnibarLoad).toHaveBeenCalled();
      });
    })
  );

  it(
    'should run omnibar navigation within the Angular zone',
    async(() => {
      skyAppConfig.skyux.host.url = 'base.com/';
      skyAppConfig.runtime.app.base = 'custom-base/';

      let beforeNavCallback: (item: BBOmnibarNavigationItem) => boolean | void;

      spyOmnibarLoad.and.callFake((config: BBOmnibarConfig) => {
        beforeNavCallback = config.nav.beforeNavCallback;
        return Promise.resolve();
      });

      skyAppConfig.skyux.omnibar = {};

      setup(skyAppConfig).then(() => {
        const zone = fixture.debugElement.injector.get(NgZone);
        const router = fixture.debugElement.injector.get(Router);

        const navigateByUrlSpy = spyOn(router, 'navigateByUrl');

        let zoneRunCallback: Function;

        const runSpy = spyOn(zone, 'run').and.callFake(
          (cb: Function): any => {
            if (cb && cb.toString().indexOf('navigateByUrl') >= 0) {
              zoneRunCallback = cb;
            } else {
              cb();
            }
          }
        );

        fixture.detectChanges();

        beforeNavCallback({
          title: '',
          url: 'base.com/custom-base/new-place'
        });

        expect(runSpy).toHaveBeenCalled();
        expect(navigateByUrlSpy).not.toHaveBeenCalled();

        zoneRunCallback();

        expect(navigateByUrlSpy).toHaveBeenCalled();
      });
    })
  );

  it('should call omnibar destroy if it was loaded', async(() => {
    skyAppConfig.skyux.omnibar = {};

    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      fixture.destroy();
      expect(spyOmnibarLoad).toHaveBeenCalled();
      expect(spyOmnibarDestroy).toHaveBeenCalled();
    });
  }));

  it('should not load the omnibar or help widget if the addin param is 1', () => {
    const spyHelp = spyOn(mockHelpInitService, 'load');

    skyAppConfig.runtime.params.get = (key: string) => key === 'addin' ? '1' : undefined;
    skyAppConfig.skyux.omnibar = true;

    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad).not.toHaveBeenCalled();
      expect(spyHelp).not.toHaveBeenCalled();
    });
  });

  it('should set the onSearch property if a search provider is provided', async(() => {
    skyAppConfig.skyux.omnibar = {};

    setup(skyAppConfig, true).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].onSearch).toBeDefined();
    });
  }));

  it('should call the search provider getSearchResults in the onSearch callback', async(() => {
    skyAppConfig.skyux.omnibar = {};

    setup(skyAppConfig, true).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].onSearch).toBeDefined();

      const search = {
        searchText: 'test-search'
      };
      spyOmnibarLoad.calls.first().args[0].onSearch(search);
      expect(searchArgs).toEqual(search);
    });
  }));

  it('should set the allow anonymous flag based on the app\'s auth configuration', async(() => {
    skyAppConfig.skyux.omnibar = {};

    skyAppConfig.skyux.auth = true;

    setup(skyAppConfig, true).then(() => {
      fixture.detectChanges();

      expect(spyOmnibarLoad).toHaveBeenCalledWith(
        jasmine.objectContaining({
          allowAnonymous: false
        })
      );
    });
  }));

  it('should set the known params on the omnibar config if they exist', async(() => {
    skyAppConfig.skyux.omnibar = {};

    skyAppConfig.skyux.params = ['envid', 'svcid', 'leid'];
    skyAppConfig.runtime.params.has = (key: any) => true;
    skyAppConfig.runtime.params.get = (key: any) => key + 'Value';
    setup(skyAppConfig, true).then(() => {
      fixture.detectChanges();

      // Notice envid => envId
      expect(spyOmnibarLoad.calls.first().args[0].envId).toEqual('envidValue');

      // Notice svcid => svcId
      expect(spyOmnibarLoad.calls.first().args[0].svcId).toEqual('svcidValue');

      // Notice svcid => svcId
      expect(spyOmnibarLoad.calls.first().args[0].leId).toEqual('leidValue');
    });
  }));

  it('should not create BBOmnibarNavigation if omnibar.nav is set', async(() => {
    skyAppConfig.skyux.omnibar = {
      nav: {
        services: [{}]
      }
    };

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].nav.services.length).toEqual(1);
    });
  }));

  it('should mark first service as selected if no omnibar.nav.services are selected', async(() => {
    skyAppConfig.skyux.omnibar = {
      nav: {
        services: [
          {},
          {}
        ]
      }
    };

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].nav.services[0].selected).toEqual(true);
    });
  }));

  it('should not mark the first service as selected if another one is already marked', async(() => {
    skyAppConfig.skyux.omnibar = {
      nav: {
        services: [
          {},
          { selected: true }
        ]
      }
    };

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].nav.services[1].selected).toEqual(true);
    });
  }));

  it('should recursively set the url property to omnibar.nav.services.items', async(() => {
    skyAppConfig.skyux.host.url = 'base.com/';
    skyAppConfig.runtime.app.base = 'custom-base/';
    skyAppConfig.skyux.omnibar = {
      nav: {
        services: [
          {
            items: [
              {
                url: 'ignored.com'
              },
              {
                route: '/custom-route'
              },
              {
                items: [
                  {
                    route: '/another-custom-route'
                  },
                  {
                    url: 'another-ignored.com'
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    skyAppConfig.runtime.params.getUrl = (url: string) => url + '?envid=abc';

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      const items = spyOmnibarLoad.calls.first().args[0].nav.services[0].items;
      expect(items[0].url).toEqual('ignored.com');
      expect(items[1].url).toEqual('base.com/custom-base/custom-route?envid=abc');
      expect(items[2].items[0].url).toEqual('base.com/custom-base/another-custom-route?envid=abc');
      expect(items[2].items[1].url).toEqual('another-ignored.com');
    });
  }));

  it('should add the beforeNavCallback', async(() => {
    skyAppConfig.skyux.omnibar = {};
    skyAppConfig.skyux.host.url = 'base.com/';
    skyAppConfig.runtime.app.base = 'custom-base/';

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].nav.beforeNavCallback).toBeDefined();
    });
  }));

  it('should enable help for the omnibar when help config is present', async(() => {
    skyAppConfig.skyux.omnibar = {};
    skyAppConfig.skyux.help = {
      productId: 'test-config'
    };

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();

      expect(spyOmnibarLoad).toHaveBeenCalledWith(jasmine.objectContaining({
        enableHelp: true
      }));
    });
  }));

  it('should call navigateByUrl, return false in the beforeNavCallback if local link', async(() => {
    skyAppConfig.skyux.omnibar = {};
    skyAppConfig.skyux.host.url = 'base.com/';
    skyAppConfig.runtime.app.base = 'custom-base/';

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      const cb = spyOmnibarLoad.calls.first().args[0].nav.beforeNavCallback;

      const globalLink = cb({
        title: 'foo',
        url: 'asdf.com'
      });

      expect(globalLink).toEqual(true);
      expect(navigateByUrlParams).not.toBeDefined();

      const localLink = cb({
        title: 'bar',
        url: 'base.com/custom-base/new-place'
      });

      expect(localLink).toEqual(false);
      expect(navigateByUrlParams).toEqual('/new-place');
    });
  }));

  it('should handle global links that start with the same base URL as the SPA', async(() => {
    skyAppConfig.skyux.omnibar = {};
    skyAppConfig.skyux.host.url = 'base.com/';
    skyAppConfig.runtime.app.base = 'custom-base/';

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      const cb = spyOmnibarLoad.calls.first().args[0].nav.beforeNavCallback;

      const globalLink = cb({
        title: 'foo',
        url: 'base.com/custom-base-2'
      });

      expect(globalLink).toEqual(true);
      expect(navigateByUrlParams).not.toBeDefined();
    });
  }));

  it('should use the original url casing if calling navigateByUrl', async(() => {
    skyAppConfig.skyux.omnibar = {};
    skyAppConfig.skyux.host.url = 'base.com/';
    skyAppConfig.runtime.app.base = 'custom-base/';

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      const cb = spyOmnibarLoad.calls.first().args[0].nav.beforeNavCallback;

      const localLink = cb({
        title: 'foo',
        url: 'base.com/custom-base/new-place?envid=AbCd'
      });

      expect(localLink).toEqual(false);
      expect(navigateByUrlParams).toEqual('/new-place?envid=AbCd');
    });
  }));

  it('should handle no public routes during serve', async(() => {
    skyAppConfig.skyux.omnibar = {};
    skyAppConfig.runtime.command = 'serve';
    skyAppConfig.skyux.routes = {};

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].nav.localNavItems).not.toBeDefined();
    });
  }));

  it('should add global public routes as localNavItems during serve', async(() => {
    skyAppConfig.skyux.omnibar = {};
    skyAppConfig.skyux.host.url = 'base.com/';
    skyAppConfig.runtime.app.base = 'custom-base/';
    skyAppConfig.runtime.command = 'serve';
    skyAppConfig.skyux.routes = {
      public: [
        {
          global: false
        },
        {
          global: true,
          name: 'my-name',
          route: '/my-route'
        }
      ]
    };

    skyAppConfig.runtime.params.getUrl = (url: string) => url + '?envid=123';

    setup(skyAppConfig, false).then(() => {
      fixture.detectChanges();
      expect(spyOmnibarLoad.calls.first().args[0].nav.localNavItems[0]).toEqual({
        title: 'my-name',
        url: 'base.com/custom-base/my-route?envid=123',
        data: {
          global: true,
          name: 'my-name',
          route: '/my-route'
        }
      });
    });
  }));

  it('should not call HelpInitializationService.load if help config does not exist', async(() => {
    const spyHelp = spyOn(mockHelpInitService, 'load');
    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      expect(spyHelp).not.toHaveBeenCalled();
    });
  }));

  it('should pass help config to HelpInitializationService.load', async(() => {
    const spyHelp = spyOn(mockHelpInitService, 'load');
    skyAppConfig.skyux.help = { productId: 'test-config' };
    skyAppConfig.runtime.params.has = (key: any) => false;
    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      expect(spyHelp).toHaveBeenCalledWith(skyAppConfig.skyux.help);
    });
  }));

  it('should set isReady after SkyAppStyleLoader.loadStyles is resolved', async(() => {
    setup(skyAppConfig).then(() => {
      expect(comp.isReady).toEqual(true);
    });
  }));

  it('should respond when SkyAppStyleLoader.loadStyles is resolved', fakeAsync(() => {
    let viewportVisible: boolean;

    let styleResolve: () => void;

    const stylePromise = new Promise((resolve) => {
      styleResolve = resolve;
    });

    viewport
      .visible
      .subscribe((value: boolean) => {
        viewportVisible = value;
      });

    setup(skyAppConfig, false, stylePromise);

    tick();

    expect(comp.isReady).toBe(false);
    expect(viewportVisible).toBeUndefined();

    styleResolve();
    tick();

    expect(comp.isReady).toBe(true);
    expect(viewportVisible).toBe(true);
  }));

  it('should pass SkyAppStyleLoader error through resolve and console.log it', async(() => {
    const result = {
      error: {
        message: 'my-error'
      }
    };

    spyOn(console, 'log');
    setup(skyAppConfig, false, Promise.resolve(result)).then(() => {
      expect(comp.isReady).toEqual(true);
      expect(console.log).toHaveBeenCalledWith(result.error.message);
    });
  }));

  it(
    'should load the omnibar when the omnibar provider\'s ready() promise is resolved',
    fakeAsync(() => {
      validateOmnibarProvider(
        {
          envId: '999',
          svcId: 'zzz'
        }
      );
    })
  );

  it('should consider the omnibar provider args envId property optional', fakeAsync(() => {
    validateOmnibarProvider(
      {
        envId: '999'
      },
      {
        svcId: jasmine.anything()
      }
    );
  }));

  it('should consider the omnibar provider args svcId property optional', fakeAsync(() => {
    validateOmnibarProvider(
      {
        svcId: 'zzz'
      },
      {
        envId: jasmine.anything()
      }
    );
  }));

  it('should add message event listener during e2e', async(() => {
    skyAppConfig.runtime.command = 'e2e';

    setup(skyAppConfig, false).then(() => {
      const spyEventListener = spyOn(mockWindow.nativeWindow, 'addEventListener');
      fixture.detectChanges();

      const goodUrl = 'some-route';
      const goodMessageType = 'sky-navigate-e2e';
      const badUrl = 'some-other-route';
      const badMessageType = 'navigate';

      const message = spyEventListener.calls.first().args[0];
      const eventListener: any = spyEventListener.calls.first().args[1];

      expect(message).toEqual('message');
      expect(spyEventListener).toHaveBeenCalled();

      // Trigger a valid message
      eventListener({
        data: {
          messageType: goodMessageType,
          url: goodUrl
        }
      });

      expect(navigateParams).toEqual(goodUrl);

      // Trigger an invalid message
      eventListener({
        data: {
          messageType: badMessageType,
          url: badUrl
        }
      });

      expect(navigateParams).not.toEqual(badUrl);
    });
  }));

  it('should initialize the theme service with the specified theme', async(() => {
    skyAppConfig.skyux.app = {
      theming: {
        theme: 'modern'
      }
    };

    setup(skyAppConfig).then(() => {
      fixture.detectChanges();

      validateThemeInit(
        SkyTheme.presets.modern,
        SkyThemeMode.presets.light
      );
    });
  }));

  it(
    'should initialize the theme service with the default theme when no theme is specified',
    async(() => {
      setup(skyAppConfig).then(() => {
        fixture.detectChanges();

        validateThemeInit(
          SkyTheme.presets.default,
          SkyThemeMode.presets.light
        );
      });
    })
  );

  it(
    'should init the theme service and omnibar with the theme mapped to the current service ID',
    async(() => {
      skyAppConfig.skyux.app = {
        theming: {
          supportedThemes: [
            'default',
            'modern'
          ],
          theme: 'default'
        }
      };

      skyAppConfig.skyux.omnibar = {};

      const mockSkyuxHost = {
        theming: {
          serviceIdMap: {
            'foo': 'modern'
          }
        }
      };

      skyAppConfig.runtime.params.get = (key: string) => key === 'svcid' ? 'foo' : undefined;

      setup(skyAppConfig, undefined, undefined, undefined, mockSkyuxHost).then(() => {
        fixture.detectChanges();

        validateThemeInit(
          SkyTheme.presets.modern,
          SkyThemeMode.presets.light
        );

        expect(spyOmnibarLoad).toHaveBeenCalledWith(
          jasmine.objectContaining({
            theme: {
              mode: 'light',
              name: 'modern'
            }
          })
        );
      });
    })
  );

  it(
    'should initialize the theme service with theme specified in config when not mapped ' +
    'to a service ID',
    async(() => {
      skyAppConfig.skyux.app = {
        theming: {
          supportedThemes: [
            'default',
            'modern'
          ],
          theme: 'modern'
        }
      };

      const mockSkyuxHost = {
        theming: {
          serviceIdMap: { }
        }
      };

      skyAppConfig.runtime.params.get = (key: string) => key === 'svcid' ? 'bar' : undefined;

      setup(skyAppConfig, undefined, undefined, undefined, mockSkyuxHost).then(() => {
        fixture.detectChanges();

        validateThemeInit(
          SkyTheme.presets.modern,
          SkyThemeMode.presets.light
        );
      });
    })
  );

  it(
    'should initialize the theme service with theme specified in config when a service ID ' +
    'is specified but no service ID map is present',
    async(() => {
      skyAppConfig.skyux.app = {
        theming: {
          supportedThemes: [
            'default',
            'modern'
          ],
          theme: 'modern'
        }
      };

      skyAppConfig.runtime.params.get = (key: string) => key === 'svcid' ? 'bar' : undefined;

      setup(skyAppConfig).then(() => {
        fixture.detectChanges();

        validateThemeInit(
          SkyTheme.presets.modern,
          SkyThemeMode.presets.light
        );
      });
    })
  );

  it('should destroy the theme service when the component is destroyed', async(() => {
    setup(skyAppConfig).then(() => {
      fixture.detectChanges();
      fixture.destroy();

      expect(mockThemeSvc.destroy).toHaveBeenCalled();
    });
  }));

  it('should update the omnibar theme when the page theme changes', fakeAsync(() => {
    skyAppConfig.skyux.omnibar = {};

    setup(skyAppConfig).then(() => {
      fixture.detectChanges();

      // Force the BBOmnibar.load() Promise to resolve.
      tick();

      mockThemeSvc.settingsChange.next({
        previousSettings: defaultThemeSettings,
        currentSettings: new SkyThemeSettings(
          SkyTheme.presets.modern,
          SkyThemeMode.presets.light
        )
      });

      expect(spyOmnibarUpdate).toHaveBeenCalledWith({
        theme: {
          mode: 'light',
          name: 'modern'
        }
      });
    });
  }));

});
