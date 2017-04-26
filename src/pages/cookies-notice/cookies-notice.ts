import { Component } from '@angular/core';
import { Platform, NavController, NavParams } from 'ionic-angular';

import { HomePage } from '../home/home';
import { LegalPage } from '../legal/legal';

import { GlobalVars } from '../../providers/global-vars';
import { Analytics } from '../../providers/analytics';

@Component({
  selector: 'page-cookies-notice',
  templateUrl: 'cookies-notice.html'
})
export class CookiesNoticePage {

  globalVars: GlobalVars;

  constructor(public platform: Platform, public navCtrl: NavController, public navParams: NavParams, public analytics: Analytics) {

    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
    }).catch((e) => {
      console.error(e);
    })

  }

  showMoreInfo() {
    this.navCtrl.push(LegalPage, {
        content: 'cookies'
      });
  }

  acceptCookies() {
    this.globalVars.setCookiesAccepted();

    if (!this.globalVars.isDNTActive()) {
      this.analytics.init(); // Init Google Analytics
    }

    this.navCtrl.setRoot(HomePage);
  }

}
