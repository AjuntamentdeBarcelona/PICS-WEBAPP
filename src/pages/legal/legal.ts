import { Component } from '@angular/core';
import { NavController, NavParams, Platform, ViewController } from 'ionic-angular';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../../providers/global-vars';
import { Analytics } from '../../providers/analytics';

@Component({
  selector: 'page-legal',
  templateUrl: 'legal.html'
})
export class LegalPage {

  public content: any;

  globalVars: GlobalVars;
  navbarColor: string;

  languageConfig: string;
  toTranslate = [
    'Back'
  ]
  translated: {} = new Object;

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform, public analytics: Analytics, public translate: TranslateService, private viewCtrl: ViewController) {
    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
      this.navbarColor = this.globalVars.getVar('navbarColor');
      this.content = this.navParams.get('content');

      // Translate strings and iOS Back button
      for(let valFrom of this.toTranslate) {
        this.translate.get(valFrom).subscribe(valTo => {
            this.translated[valFrom] = valTo;
            this.viewCtrl.setBackButtonText(this.translated['Back']);
        })
      }
    })
  }

  ionViewWillEnter() {
    let pageName = this.navParams.get('content');

    this.platform.ready().then(() => {
      if(pageName != 'cookies') { // Can't call Analytics from Cookies Information page
        this.analytics.trackPage('legal/'+this.navParams.get('content'));
      }
    })
  }

}
