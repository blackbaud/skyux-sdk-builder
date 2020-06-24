import {
  NgModule
} from '@angular/core';

import {
  SkyAppLocaleProvider
} from '@skyux/i18n';

import {
  SkyAppHostLocaleProvider
} from './host-locale-provider';

@NgModule({
  providers: [
    {
      provide: SkyAppLocaleProvider,
      useClass: SkyAppHostLocaleProvider
    }
  ]
})
export class SkyAppHostLocaleModule {}
