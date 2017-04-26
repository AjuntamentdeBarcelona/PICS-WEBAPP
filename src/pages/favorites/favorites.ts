import { Component } from '@angular/core';
import { NavController, NavParams, Platform, ActionSheetController, PopoverController, ViewController, AlertController } from 'ionic-angular';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../../providers/global-vars';
import { OfflineData } from '../../providers/offline-data';
import { Analytics } from '../../providers/analytics';

import { FavoritesMapPage } from '../favorites-map/favorites-map';
import { DetailPage } from '../detail/detail';


@Component({
  selector: 'page-favorites',
  templateUrl: 'favorites.html'
})
export class FavoritesPage {

  globalVars: GlobalVars;
  navbarColor: string;

  pois: Array<any> = new Array();

  toTranslate = [
    "Delete all favorites",
    "Delete all favorites?",
    "The list of saved points of interest will be empty and they will no longer be available without connection",
    "Delete",
    "Cancel"
  ]
  translated: any = {};

  isConnected: boolean = true;

  constructor(public translate: TranslateService, public navCtrl: NavController, public navParams: NavParams, public platform: Platform, public offlineData: OfflineData, public popoverCtrl: PopoverController, public actionSheetCtrl: ActionSheetController, public alertCtrl: AlertController, public analytics: Analytics) {
    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
      this.navbarColor = this.globalVars.getVar('navbarColor');

      this.offlineData.initDB();
    })
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {

      this.analytics.trackPage('favorites');

      if(typeof this.navParams.data == 'empty') while (this.pois.length) { this.pois.pop(); };
      this.updateFavoritesList();

      if (!this.globalVars.isDeviceConnected()) this.isConnected = false;
      else this.isConnected = true;

      for(let valFrom of this.toTranslate) {
        this.translate.get(valFrom).subscribe(valTo => {
          this.translated[valFrom] = valTo;
        })
      }

    })
  }

  updateFavoritesList() {
    let lang = this.globalVars.getVar('lang');

    while (this.pois.length) { this.pois.pop(); } // To empty current items

    this.offlineData.getAllFavorites().then((data) => {

      for (let i=0; i<data.length; i++) {
        this.pois.push({});
        for (let field in data[i]) {
          if(typeof data[i][field] === 'object') {
            if(field == 'images') { // Is image object, pick only first
              if(typeof data[i][field][0] != "undefined") this.pois[i]['image'] = data[i][field][0];
            } else if(field == 'contents') {
              for (let contents in data[i][field]) {
                if(data[i][field][contents]['locales']['code'] == lang) {
                  this.pois[i]['title'] = data[i][field][contents]['title'];
                  this.pois[i]['excerpt'] = data[i][field][contents]['excerpt'];
                }
              }
            }
          } else {
            this.pois[i][field] = data[i][field];
          }
        }
        this.pois[i]['categoryLabel'] = this.getCategoryLabel(this.pois[i]['category_id']);
        this.pois[i]['distance'] = this.getDistance(this.pois[i]['lon'],this.pois[i]['lat']);

        if(typeof this.pois[i]['image'] !== "undefined") this.pois[i]['image_url'] = 'data:'+this.pois[i]['image']['image_mime']+';base64,'+this.pois[i]['image']['image_base64'];
      }

      this.checkFavorites();

    });
  }

  addFavorite(e, poiId) {
    if (this.globalVars.isDeviceConnected()) {
      this.showAsFavorite(poiId); // Show it like favorite for optimistic UX
      this.analytics.trackEvent('favorites', 'add', poiId);

      this.offlineData.addFavorite(poiId).then((resp) => {
        this.checkFavorites();
      });
    }

    e.stopPropagation();
  }

  removeFavorite(e, poiId) {
    this.analytics.trackEvent('favorites', 'remove', poiId);

    this.offlineData.removeFavorite(poiId).then((resp) => {
      this.checkFavorites();
    });

    e.stopPropagation();
  }

  showAsFavorite(poiId) {
    for (let poi in this.pois) {
      if(this.pois[poi]['id'] == poiId) {
        this.pois[poi].isFavorite = true;
        return;
      }
    }
  }

  checkFavorites() { // Check if POI id is already saved into PouchDB
    for (let poi in this.pois) {
      this.offlineData.getFavorite(this.pois[poi].id).then((resp) => {
        if(resp != false) {
          this.pois[poi].isFavorite = true;
        } else {
          this.pois[poi].isFavorite = false;
        }
      });
    }
  }

  goToDetail(id) {
    this.offlineData.getFavorite(id).then((resp) => { // Is favorite
      if(resp != false) {
        this.navCtrl.push(DetailPage, {
          id: id
        });
      }
      else {
        if (this.globalVars.isDeviceConnected()) { // No favorite, but connected
          this.navCtrl.push(DetailPage, {
            id: id
          });
        }
     }
    });
  }

  getCategoryLabel(categoryId) {
    let name = this.globalVars.getCategoryName(categoryId);
    if(name) {
      let htmlClass = "cat"+categoryId;
      return `<span class='${htmlClass}'>${name}</span>`;
    }
  }

  getDistance(lon,lat) {
    let distance = undefined;

    if(this.globalVars.isGeolocated()) {
      let userLon = this.globalVars.getVar('lon');
      let userLat = this.globalVars.getVar('lat');

      // Return distance in KM with 1 digit after decimal point
      distance = ( 6371 * Math.acos( Math.cos( this.toRadians(userLat) ) * Math.cos( this.toRadians(lat) ) * Math.cos( this.toRadians(lon) - this.toRadians(userLon) ) + Math.sin( this.toRadians(userLat) ) * Math.sin(this.toRadians(lat)) ) ).toFixed(1);
    }

    return distance;
  }

  toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  changeView() {
    this.navCtrl.setRoot(FavoritesMapPage); // Change to map view
  }

  openOptions(ev?: Event) {
    if(this.platform.is('ios')) {
      let actionSheet = this.actionSheetCtrl.create({
        buttons: [
          {
            text: this.translated['Delete all favorites'],
            role: 'destructive',
            handler: () => {
              this.showConfirm(this.alertCtrl, this.offlineData, this.pois, this.analytics, this.translated, this.navCtrl);
            }
          },
          {
            text: this.translated['Cancel'],
            role: 'cancel',
            handler: () => {}
          }
        ]
      });
      actionSheet.present();
    }
    else {
      let popover = this.popoverCtrl.create(FavoritesPopover, {
          showConfirm: this.showConfirm,
          alertCtrl: this.alertCtrl,
          offlineData: this.offlineData,
          pois: this.pois,
          analytics: this.analytics,
          translated: this.translated,
          navCtrl: this.navCtrl
      });
      popover.present({ ev: ev });
    }
  }

  showConfirm(alertCtrl, offlineData, pois, analytics, translated, navCtrl?) {
    analytics.trackEvent('favorites', 'removeAll', 'asked');

    let confirm = alertCtrl.create({
      title: translated['Delete all favorites?'],
      message: translated['The list of saved points of interest will be empty and they will no longer be available without connection'],
      buttons: [
        {
          text: translated['Cancel']
        },
        {
          text: translated['Delete'],
          handler: () => {
            analytics.trackEvent('favorites', 'removeAll', 'confirmed');
            offlineData.removeAllFavorites().then((resp) => {
              while (pois.length) { pois.pop(); } // To empty current items
            });
          }
        }
      ]
    });
    confirm.present();
  }

}


// Popover content for non-iOS platforms

@Component({
  template: `
    <ion-list>
      <button ion-item (click)="showConfirm()">{{ 'Delete all favorites' | translate }}</button>
    </ion-list>
  `
})

export class FavoritesPopover {

  constructor(public viewCtrl: ViewController, public params: NavParams) {
  }

  showConfirm() {
    this.params.get('showConfirm')(this.params.get('alertCtrl'), this.params.get('offlineData'), this.params.get('pois'), this.params.get('analytics'), this.params.get('translated'), this.params.get('navCtrl'));
    this.viewCtrl.dismiss();
  }

}
