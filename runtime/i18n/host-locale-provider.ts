import {
  Injectable
} from '@angular/core';

import {
  SkyAppWindowRef
} from '@skyux/core';

import {
  SkyAppLocaleInfo,
  SkyAppLocaleProvider
} from '@skyux/i18n';

import {
  Observable,
  of
} from 'rxjs';

@Injectable()
export class SkyAppHostLocaleProvider extends SkyAppLocaleProvider {
  public get currentLocale(): string {
    let locale: string | undefined;

    const skyuxHost = (this.windowRef.nativeWindow as any).SKYUX_HOST;

    if (skyuxHost) {
      const acceptLanguage = skyuxHost.acceptLanguage || '';
      locale = acceptLanguage.split(',')[0];
    }

    locale = locale || this.defaultLocale;

    return locale;
  }

  constructor(
    private windowRef: SkyAppWindowRef
  ) {
    super();
  }

  public getLocaleInfo(): Observable<SkyAppLocaleInfo> {
    const localeInfo: SkyAppLocaleInfo = {
      locale: this.currentLocale
    };

    return of(localeInfo);
  }
}
