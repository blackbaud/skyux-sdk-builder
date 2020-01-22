import {
  BBAuthClientFactory
} from '@skyux/auth-client-factory';

import {
  SkyAppSetTitleArgs
} from '@skyux/core';

import {
  SkyAppOmnibarTitleService
} from './omnibar-title.service';

describe('Omnibar title service', () => {

  it('should pass setTitle() calls through to the omnibar', () => {
    const setTitleSpy = spyOn(BBAuthClientFactory.BBOmnibar, 'setTitle');

    const titleSvc = new SkyAppOmnibarTitleService();

    const args: SkyAppSetTitleArgs = {
      titleParts: [
        'Part 1',
        'Part 2'
      ]
    };

    titleSvc.setTitle(args);

    expect(setTitleSpy).toHaveBeenCalledWith(args);
  });

});
