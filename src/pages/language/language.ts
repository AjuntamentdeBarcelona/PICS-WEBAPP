import { Component } from '@angular/core';
import { NavController, NavParams, Platform, ViewController } from 'ionic-angular';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../../providers/global-vars';
import { Analytics } from '../../providers/analytics';

@Component({
  selector: 'page-language',
  templateUrl: 'language.html'
})
export class LanguagePage {

  globalVars: GlobalVars;
  navbarColor: string;

  languageConfig: string;
  toTranslate = [
    'Back'
  ]
  translated: {} = new Object;

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform, public translate: TranslateService, public analytics: Analytics, private viewCtrl: ViewController) {
    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
      this.navbarColor = this.globalVars.getVar('navbarColor');
      this.languageConfig = this.globalVars.getVar('lang');
    })
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {
      this.analytics.trackPage('language');

      // Translate strings and iOS Back button
      for(let valFrom of this.toTranslate) {
        this.translate.get(valFrom).subscribe(valTo => {
            this.translated[valFrom] = valTo;
            this.viewCtrl.setBackButtonText(this.translated['Back']);
        })
      }

    })
  }

  goBack(){
    this.navCtrl.pop();
  }

  changeLanguage() {
    this.analytics.trackEvent('language', 'change', this.languageConfig);

    this.globalVars.getUserLanguage().then((userLang) => {

      if(this.languageConfig != userLang) {
        this.globalVars.setUserLanguage(this.languageConfig);
        this.platform.setLang(this.languageConfig, true);
        this.translate.setDefaultLang(this.languageConfig);
        this.translate.use(this.languageConfig);
      }

    });
  }
}
