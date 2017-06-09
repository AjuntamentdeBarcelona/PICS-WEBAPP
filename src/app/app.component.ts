import { Component, ViewChild, enableProdMode } from '@angular/core';
import { Platform, Nav } from 'ionic-angular';
import { Splashscreen, Network } from 'ionic-native';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../providers/global-vars';
import { PoisData } from '../providers/pois-data';
import { Analytics } from '../providers/analytics';

import { HomePage } from '../pages/home/home';
import { FavoritesPage } from '../pages/favorites/favorites';
import { DistrictPage } from '../pages/district/district';
import { LanguagePage } from '../pages/language/language';
import { LegalPage } from '../pages/legal/legal';
import { CookiesNoticePage } from '../pages/cookies-notice/cookies-notice';
import { ErrorConnectPage } from '../pages/error-connect/error-connect';

export interface PageObj {
  title: string;
  component: any;
  icon?: string;
  parameter?: string;
}

enableProdMode();

@Component({
  templateUrl: 'app.html'
})
export class PicApp {
  // the root nav is a child of the root app component
  // @ViewChild(Nav) gets a reference to the app's root nav
  @ViewChild(Nav) nav: Nav;
  rootPage: any;

  appMenuPages = {
     'HomePage': HomePage,
     'DistrictPage': DistrictPage,
     'FavoritesPage': FavoritesPage,
     'LanguagePage': LanguagePage,
     'LegalPage': LegalPage
  };
  appMenuDistricts: PageObj[] = [
      { title: 'Ciutat Vella', component: DistrictPage, parameter: '1'},
      { title: 'L\'Eixample', component: DistrictPage, parameter: '2'},
      { title: 'Sants-Montjuïc', component: DistrictPage, parameter: '3'},
      { title: 'Les Corts', component: DistrictPage, parameter: '4'},
      { title: 'Sarrià-St. Gervasi', component: DistrictPage, parameter: '5'},
      { title: 'Gràcia', component: DistrictPage, parameter: '6'},
      { title: 'Horta-Guinardó', component: DistrictPage, parameter: '7'},
      { title: 'Nou Barris', component: DistrictPage, parameter: '8'},
      { title: 'Sant Andreu', component: DistrictPage, parameter: '9'},
      { title: 'Sant Martí', component: DistrictPage, parameter: '10'}
  ];

  globalVars: GlobalVars;
  _connectSubscription: any;
  _disconnectSubscription: any;

  constructor(public platform: Platform, translate: TranslateService, public poisData: PoisData, public analytics: Analytics) {

    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();

      // Subscribe to event when connection is lost
      this._connectSubscription = Network.onDisconnect().subscribe(() => {
        setTimeout(() => { // Wait to avoid micro-disconnections
          this.globalVars.setConnectedVal(false);
          let view = this.nav.getActive();
          if ( !(view.instance instanceof CookiesNoticePage) && !(view.instance instanceof FavoritesPage) ){
            this.nav.setRoot(ErrorConnectPage);
          }
        }, 2000);
      });
      // Subscribe to event when connection is available again
      this._connectSubscription = Network.onConnect().subscribe(() => {
        setTimeout(() => { // Wait for connection to be ready
          this.globalVars.setConnectedVal(true);
          let view = this.nav.getActive();
          if (view.instance instanceof ErrorConnectPage){
            this.nav.setRoot(HomePage);
          }
        }, 3000);
      });

      // Choose navbar color depending on platform
      if (platform.is('ios')) {
        this.globalVars.setVar('navbarColor','default');
      } else {
        this.globalVars.setVar('navbarColor','primary');
      }

      // Set language options
      this.globalVars.getUserLanguage().then((value) => {

        let userLang: any = value; // Set previously saved language
        if(!userLang) userLang = window.navigator.language.split('-')[0]; // Set language depending on browser's locale
        if(!userLang || (this.globalVars.getVar('acceptedLangs').lastIndexOf(userLang) == -1)) userLang = this.globalVars.getVar('acceptedLangs')[0]; // Set first language available in app

        this.globalVars.setUserLanguage(userLang);
        this.platform.setLang(userLang, true);
        translate.setDefaultLang(userLang);
        translate.use(userLang);

        // Get all categories and languages
        if (this.globalVars.isDeviceConnected()) { // Load information only if device connected

          this.poisData.getCategories(true).then((data) => {
            let tempCategories: Array<any> = Array();

            for (let category in data) {
              tempCategories.push(data[category]);
            }

            this.globalVars.updateCategories(tempCategories);

            this.goToMainPage();

          });
        }
        else { // If no connection
          this.goToMainPage();
        }

      });
    }).catch((e) => {
      console.error(e);
    })
  }

  goToMainPage() {
    this.globalVars.checkCookiesAccepted().then((hasAcceptedCookies) => {

      if (hasAcceptedCookies && !this.globalVars.isDNTActive()) {
        this.analytics.init(); // Init Google Analytics
      }

      Splashscreen.hide();

      // Go to next main page
      if (!hasAcceptedCookies && !this.globalVars.isDNTActive()) { // If no cookies accepted and not DNT active
        this.rootPage = CookiesNoticePage;
      }
      else if(this.platform.url().search(/#\/\w+/i) == -1) { // If no URL parameters to force rootPage
        this.rootPage = HomePage;
      }
      else { // URL has parameters
        if(this.platform.is('ios') && (typeof window.navigator['standalone'] !== "undefined")) { // Device is iOS
          if(window.navigator['standalone'] == true) { // Opened as standalone
            this.rootPage = HomePage; // Force homepage
          }
        }
      }

    });
  }

  openPageObj(page: PageObj) {
    // parameter: variable to select a District
    this.nav.setRoot(page.component, {
      content: page.parameter
    });
  }

  openPage(pageName, pageParameter?) {
    if(pageParameter) {
      this.nav.setRoot(this.appMenuPages[pageName], {
        content: pageParameter
      });
    }
    else {
      this.nav.setRoot(this.appMenuPages[pageName]);
    }
  }

  openDistrict(pageComponent, pageParameter) {
    this.nav.setRoot(pageComponent, {
      district: pageParameter
    });
  }

  openPopup(pageName, pageParameter?) {
    if(pageParameter) {
      this.nav.push(this.appMenuPages[pageName], {
        content: pageParameter
      });
    }
    else {
      this.nav.push(this.appMenuPages[pageName]);
    }
  }

}
