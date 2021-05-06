// This is only visible in EASY MODE
import {
  NgModule
} from '@angular/core';

import {
  BrowserAnimationsModule
} from '@angular/platform-browser/animations';

import {
  RouterModule
} from '@angular/router';

import {
  AppComponent
} from './app.component';

// File is dynamically built using webpack loader
import {
  SkyPagesModule
} from './sky-pages.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserAnimationsModule,
    RouterModule,
    SkyPagesModule
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }
