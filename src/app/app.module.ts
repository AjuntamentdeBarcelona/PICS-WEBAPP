import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Http, HttpModule } from "@angular/http";
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { TranslateModule, TranslateLoader, TranslateStaticLoader } from 'ng2-translate/ng2-translate';

import { GlobalVars } from '../providers/global-vars';
import { PoisData } from '../providers/pois-data';
import { OfflineData } from '../providers/offline-data';
import { Analytics } from '../providers/analytics';

import { PicApp } from './app.component';

import { HomePage, HomePagePopover } from '../pages/home/home';
import { HomeMapPage, HomeMapPagePopover } from '../pages/home-map/home-map';
import { FavoritesPage, FavoritesPopover } from '../pages/favorites/favorites';
import { FavoritesMapPage } from '../pages/favorites-map/favorites-map';
import { DistrictPage, DistrictPagePopover } from '../pages/district/district';
import { DistrictMapPage, DistrictMapPagePopover } from '../pages/district-map/district-map';
import { LanguagePage } from '../pages/language/language';
import { LegalPage } from '../pages/legal/legal';
import { DetailPage } from '../pages/detail/detail';
import { ErrorConnectPage } from '../pages/error-connect/error-connect';
import { CookiesNoticePage } from '../pages/cookies-notice/cookies-notice';
import { SearchPage } from '../pages/search/search';

export function httpFactory(http: Http) {
  return new TranslateStaticLoader(http, './assets/i18n', '.json');
}

@NgModule({
  declarations: [
    PicApp,
    HomePage,
    HomePagePopover,
    HomeMapPage,
    HomeMapPagePopover,
    FavoritesPage,
    FavoritesPopover,
    FavoritesMapPage,
    DistrictPage,
    DistrictPagePopover,
    DistrictMapPage,
    DistrictMapPagePopover,
    LanguagePage,
    LegalPage,
    DetailPage,
    ErrorConnectPage,
    CookiesNoticePage,
    SearchPage
  ],
  imports: [
    IonicModule.forRoot(PicApp, {
        platforms: {
          windows: {
            mode: 'md'
          }
        }
      },
      {
        links: [
          { component: DetailPage, name: 'Point of interest', segment: 'detail/:id', defaultHistory: [HomePage] }
        ]
      }
    ),
    BrowserModule,
    HttpModule,
    TranslateModule.forRoot({
      provide: TranslateLoader,
      useFactory: httpFactory,
      deps: [Http]
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    PicApp,
    HomePage,
    HomePagePopover,
    HomeMapPage,
    HomeMapPagePopover,
    FavoritesPage,
    FavoritesPopover,
    FavoritesMapPage,
    DistrictPage,
    DistrictPagePopover,
    DistrictMapPage,
    DistrictMapPagePopover,
    LanguagePage,
    LegalPage,
    DetailPage,
    ErrorConnectPage,
    CookiesNoticePage,
    SearchPage
  ],
  providers: [{provide: ErrorHandler, useClass: IonicErrorHandler}, GlobalVars, PoisData, OfflineData, Analytics, Storage]
})
export class AppModule {}
