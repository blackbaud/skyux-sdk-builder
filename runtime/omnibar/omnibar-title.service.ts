import {
  Injectable
} from '@angular/core';

import {
  BBAuthClientFactory
} from '@skyux/auth-client-factory';

import {
  SkyAppSetTitleArgs
} from '@skyux/core';

@Injectable()
export class SkyAppOmnibarTitleService {

  public setTitle(args: SkyAppSetTitleArgs): void {
    BBAuthClientFactory.BBOmnibar.setTitle(args);
  }

}
