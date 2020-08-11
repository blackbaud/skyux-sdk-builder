import {
  NgModule
} from '@angular/core';

import {
  SkyAuthTokenProvider
} from '@skyux/http';

/**
 * We must provide `SkyAuthTokenProvider` in its own module to allow `app-extras.module.ts` to
 * override the provider.
 */
@NgModule({
  providers: [
    SkyAuthTokenProvider
  ]
})
export class SkyAppAuthTokenModule { }
