/*jshint jasmine: true, node: true */
/*global element, by, browser, protractor*/
'use strict';

const fs = require('fs');
const path = require('path');
const common = require('../shared/common');

const tmpSrcApp = path.resolve(process.cwd(), common.tmp, 'src/app');
const e2eRootPath = path.resolve(process.cwd(), 'e2e/skyux-lib-help-tests');

let originalHomePage;

// Add the SkyModalDemoFormComponent to the entryComponents in the app-extras module.
// TODO Find a better way to test this functionality!
const mockAppExtras = `
import {
  NgModule
} from '@angular/core';

import {
  SkyModalModule
} from '@skyux/modals';

import {
  AppSkyModule
} from './app-sky.module';

import {
  SkyModalDemoFormComponent
} from './modal-fixtures/modal-form-fixture.component';

import {
  BBHelpModule,
  HelpInitializationService
} from '@blackbaud/skyux-lib-help';

@NgModule({
  exports: [
    AppSkyModule,
    BBHelpModule,
    SkyModalModule
  ],
  entryComponents: [
    SkyModalDemoFormComponent
  ],
  providers: [
    HelpInitializationService
  ]
})
export class AppExtrasModule { }
`;

function prepareBuild() {
  const configOptions = {
    mode: 'easy',
    name: 'dist',
    compileMode: 'aot',
    help: {
      extends: 'bbhelp'
    }
  };

  return common.prepareBuild(configOptions)
    .catch(console.error);
}

function migrateFixtures() {
  const files = fs.readdirSync(`${e2eRootPath}/fixtures/skyux-modal`);

  if (!fs.existsSync(`${tmpSrcApp}/modal-fixtures`)) {
    fs.mkdirSync(`${tmpSrcApp}/modal-fixtures`);
  }

  files.forEach(file => {
    const filePath = path.resolve(`${e2eRootPath}/fixtures/skyux-modal`, file);
    const content = fs.readFileSync(filePath, 'utf8');
    common.writeAppFile(`modal-fixtures/${file}`, content);
  });
}

function addModalToHomePage() {
  migrateFixtures();
  if (!originalHomePage) {
    originalHomePage = fs.readFileSync(`${tmpSrcApp}/home.component.html`, 'utf8');
  }

  common.writeAppExtras(mockAppExtras);
  const content = `<help-modal-launcher></help-modal-launcher>`;
  common.writeAppFile('home.component.html', content, 'utf8');
}

describe('skyux lib help', () => {
  beforeAll((done) => {
    prepareBuild()
      .then(() => {
        done();
      });
    addModalToHomePage();
  });

  afterAll(() => {
    common.writeAppFile('home.component.html', originalHomePage, 'utf8');
    common.removeAppFolderItem('modal-fixtures');
    common.afterAll();
  });

  /**
   * SKY UX adds the class 'sky-modal-body-full-page' to the body tag when a full page modal is
   * launched. In order to hide the invoker tab when a full page modal is present, we added a style
   * to the app.component.scss file in builder to target the '#bb-help-container.bb-help-closed'
   * selector and add a display: none to the invoker. This test is to confirm that neither library
   * changed the class names that accomplish this style override.
   */
  it('should hide the invoker when a full page modal is opened', (done) => {
    let until = protractor.ExpectedConditions;

    browser.wait(until.presenceOf(element(by.id('bb-help-invoker'))), 60000, 'Element taking too long to appear in the DOM')
      .then(() => {

        const invoker = element(by.id('bb-help-invoker'));

        console.log('SHOULD HIDE INVOKER', invoker.isDisplayed());
        browser.sleep(60000);
        let regularModalButton = element(by.id('regular-modal-launcher'));
        let fullPageButton = element(by.id('full-page-modal-launcher'));

        expect(invoker.isDisplayed()).toBe(true);

        regularModalButton.click();
        expect(invoker.isDisplayed()).toBe(true);
        element(by.id('modal-close-button')).click();

        fullPageButton.click();
        let body = element(by.css('.sky-modal-body-full-page'));
        console.log('SHOULD HAVE CLASS ON BODY', body);

        expect(body.getAttribute('class')).toContain('sky-modal-body-full-page');

        expect(invoker.isDisplayed()).toBe(false);
        element(by.id('modal-close-button')).click();
        done();
      });
  });
});
