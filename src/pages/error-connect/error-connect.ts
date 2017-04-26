import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';

import { GlobalVars } from '../../providers/global-vars';
import { Analytics } from '../../providers/analytics';

import { FavoritesPage } from '../favorites/favorites';

@Component({
  selector: 'page-error-connect',
  templateUrl: 'error-connect.html'
})
export class ErrorConnectPage {

  globalVars: GlobalVars;
  navbarColor: string;

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform, public analytics: Analytics) {
    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
      this.navbarColor = this.globalVars.getVar('navbarColor');
    })
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {
      this.analytics.trackPage('error/noConnection');
    })
  }

  goToFavorites() {
    this.navCtrl.setRoot(FavoritesPage); // Change to Favorites
  }

}
