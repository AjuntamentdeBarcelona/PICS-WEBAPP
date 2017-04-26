import { Component } from '@angular/core';
import { NavController, NavParams, Platform, LoadingController, ActionSheetController, PopoverController, AlertController } from 'ionic-angular';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../../providers/global-vars';
import { OfflineData } from '../../providers/offline-data';
import { Analytics } from '../../providers/analytics';

import { FavoritesPage, FavoritesPopover } from '../favorites/favorites';
import { DetailPage } from '../detail/detail';
import { ErrorConnectPage } from '../error-connect/error-connect';

import 'leaflet';

@Component({
  selector: 'page-favorites-map',
  templateUrl: 'favorites-map.html'
})
export class FavoritesMapPage {

  globalVars: GlobalVars;
  navbarColor: string;

  pois: Array<any> = new Array();
  categoryIcons: Array<any> = new Array();
  categoryIconActive: any;
  lastMarker: any = undefined;

  activeInfowindow: boolean = false;
  infowindow: any;
  ionCurrentLang: string = "";

  map: any;
  markersLayer: Array<any> = new Array();

  toTranslate = [
    'Getting location'
  ]
  translated: {} = new Object;

  loading: any;

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform, public offlineData: OfflineData, public popoverCtrl: PopoverController, public actionSheetCtrl: ActionSheetController, public alertCtrl: AlertController, public translate: TranslateService, private loadCtrl: LoadingController, public analytics: Analytics) {

    platform.ready().then(() => {

      this.globalVars = GlobalVars.getInstance();

      for(let valFrom of this.toTranslate) {
        translate.get(valFrom).subscribe(valTo => {
            this.translated[valFrom] = valTo;
        })
      }

      this.createCategoryIcons();

      this.navbarColor = this.globalVars.getVar('navbarColor');
      this.offlineData.initDB();

      this.globalVars.getUserLanguage().then((userLang) => {
        this.ionCurrentLang = userLang;
        this.loadMap();
      })

    })
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {

      this.analytics.trackPage('favorites/map');

      if (!this.globalVars.isDeviceConnected()) { // If no connection, show error page
        this.navCtrl.setRoot(ErrorConnectPage);
      }

      if(this.ionCurrentLang != "") { // If user have changed app language, data must be reloaded

        for(let valFrom of this.toTranslate) {
          this.translate.get(valFrom).subscribe(valTo => {
              this.translated[valFrom] = valTo;
          })
        }

        this.globalVars.getUserLanguage().then((userLang) => {
          if(this.ionCurrentLang != userLang) {
            this.ionCurrentLang = userLang;
            this.activeInfowindow = false;
            this.updateFavoritesList();
          }
        });

      }

    })
  }

  loadMap() {
    // Init map object
    this.map = L.map('map', { attributionControl:false });

    // Set event triggers
    this.map.on('click', this.hideInfowindow.bind(this));
    this.map.on('locationfound', this.onUserLocated.bind(this));
    this.map.on('locationerror ', this.onUserLocationError.bind(this));

    if(this.globalVars.isGeolocated()) {
      // Set view to device's location
      this.map.setView([this.globalVars.getVar('lat'), this.globalVars.getVar('lon')], 15);
    } else {
      // Set view to city center (Plaça de Catalunya)
      this.map.setView([41.3870154, 2.1700471], 15);
    }

    // Print map with simple layer
    L.tileLayer('//{s}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png', {
      minZoom: 11,
      maxZoom: 18,
      detectRetina: false
    }).addTo(this.map);

    this.updateFavoritesList();
  }

  placeMapMarkers() {
    let tempIcon;
    let tempMarker;

    this.markersLayer.forEach(marker => {
      this.map.removeLayer(marker);
    });

    this.markersLayer = new Array(); // To empty current items

    this.pois.forEach(markerData => {
      if((markerData.category_id > 0) && (markerData.category_id < 11)) {
        tempIcon = L.icon(this.categoryIcons[markerData.category_id]);
        tempMarker = L.marker([markerData.lat,markerData.lon], {icon: tempIcon}).addTo(this.map).on('click', this.showInfowindow, this);
        tempMarker._poiId = markerData.id;
        tempMarker._catId = markerData.category_id;
        this.markersLayer.push(tempMarker);
      }
    });

  }

  onUserLocated(e) {
    this.loading.dismiss();
  }

  onUserLocationError(e) {
    this.loading.dismiss();
    console.log("Error " + e.code + ": " + e.message);
  }

  centerMapOnUser() {
    this.analytics.trackEvent('map', 'centerOnUser');

    this.loading = null;
    this.loading = this.createLoader('Getting location');
    this.loading.present().then(() => {
      this.map.locate({setView: true, maxZoom: 15, enableHighAccuracy: true});
    });
  }

  showInfowindow(e) {
    if(this.lastMarker !== undefined) this.lastMarker.setIcon(L.icon(this.categoryIcons[this.lastMarker._catId])); // Reset last clicked marker
    this.lastMarker = e.target;
    e.target.setIcon(L.icon(this.categoryIconActive));

    this.analytics.trackEvent('map', 'showInfowindow', e.target.id);

    this.pois.forEach(markerData => {
      if(markerData.id == e.target._poiId) {
        this.infowindow = markerData;
        this.activeInfowindow = true;
      }
    });
  }

  hideInfowindow(e) {
    if(this.lastMarker !== undefined) this.lastMarker.setIcon(L.icon(this.categoryIcons[this.lastMarker._catId]));
    this.activeInfowindow = false;
  }

  createLoader(message: string) {
    return this.loadCtrl.create({
      dismissOnPageChange: false,
      content: this.translated[message]+'...'
    });
  }

  createCategoryIcons() {
    let temp: any;
    for(let i=1; i<=10; i++) {
      temp = {
        iconUrl: 'assets/icon/map/iconmap_cat'+i+'.png',
        iconRetinaUrl: 'assets/icon/map/iconmap_cat'+i+'@2x.png',
        iconSize: [35, 40],
        iconAnchor: [17, 36]
      };
      this.categoryIcons[i] = temp;
    }

    this.categoryIconActive = {
      iconUrl: 'assets/icon/map/iconmap_cat_active.png',
      iconRetinaUrl: 'assets/icon/map/iconmap_cat_active@2x.png',
      iconSize: [35, 40],
      iconAnchor: [17, 36]
    }
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
              this.pois[i]['image'] = data[i][field][0];
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

        if(this.pois[i]['image']['image_base64'] !== null) this.pois[i]['image_url'] = 'data:'+this.pois[i]['image']['image_mime']+';base64,'+this.pois[i]['image']['image_base64'];
      }

      this.placeMapMarkers();

    });
  }

  getCategoryLabel(categoryId) {
    let name = this.globalVars.getCategoryName(categoryId);
    let htmlClass = "cat"+categoryId;
    return `<span class='${htmlClass}'>${name}</span>`;
  }

  goToDetail(id) {
    this.navCtrl.push(DetailPage, {
      id: id
    });
  }

  changeView() {
    this.navCtrl.setRoot(FavoritesPage); // Change to list view
  }

  openOptions(ev?: Event) {
    if(this.platform.is('ios')) {
      let actionSheet = this.actionSheetCtrl.create({
        buttons: [
          {
            text: 'Delete all favorites',
            role: 'destructive',
            handler: () => {
              this.showConfirm(this.alertCtrl, this.offlineData, this.pois, this.analytics, this.translated, this.navCtrl);
            }
          },
          {
            text: 'Cancel',
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
            navCtrl.setRoot(FavoritesPage, "empty"); // Change to list view with 'empty' value
          }
        }
      ]
    });
    confirm.present();
  }

}
