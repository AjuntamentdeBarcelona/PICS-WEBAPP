import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Content, NavController, NavParams, Platform, ActionSheetController, LoadingController, ViewController } from 'ionic-angular';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../../providers/global-vars';
import { PoisData } from '../../providers/pois-data';
import { OfflineData } from '../../providers/offline-data';
import { Analytics } from '../../providers/analytics';

@Component({
  selector: 'page-detail',
  templateUrl: 'detail.html'
})
export class DetailPage {
  @ViewChild(Content) content: Content;

  public id: any;

  globalVars: GlobalVars;
  navbarColor: string;
  isFavorite: boolean;
  showContent: boolean = false;
  showRelated: boolean = false;
  relatedVisible: boolean = false;
  ionCurrentLang: string;
  targetAttr: string;

  poi: {} = new Object;
  relatedPois: Array<any> = new Array();

  toTranslate = [
    'Loading',
    'Back',
    'Cancel',
    'Share'
  ]
  translated: {} = new Object;

  loading: any;

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform, public poisData: PoisData, public offlineData: OfflineData, public actionSheetCtrl: ActionSheetController, public translate: TranslateService, private loadCtrl: LoadingController, private ref: ChangeDetectorRef, private viewCtrl: ViewController, public analytics: Analytics) {
    this.isFavorite = false;
    this.id = this.navParams.get('id');

    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
      this.navbarColor = this.globalVars.getVar('navbarColor');
      this.ionCurrentLang = this.globalVars.getVar('lang');

      if(this.platform.is('ios') && (typeof window.navigator['standalone'] !== "undefined")) { // Device is iOS
        if(window.navigator['standalone'] == true) { // Opened in browser as standalone
          this.targetAttr = '_top';
        }
        else {
          this.targetAttr = '_blank';
        }
      }
      else {
        this.targetAttr = '_blank';
      }

      // If app opens on this page (accessed by URL), language must be loaded
      if(!this.ionCurrentLang || (this.ionCurrentLang == "")) {
        this.globalVars.getUserLanguage().then((value) => {
          this.ionCurrentLang = value; // Set previously saved language
          if(!this.ionCurrentLang) this.ionCurrentLang = window.navigator.language.split('-')[0]; // Set language depending on browser's locale
          if(!this.ionCurrentLang || (this.globalVars.getVar('acceptedLangs').lastIndexOf(this.ionCurrentLang) == -1)) this.ionCurrentLang = this.globalVars.getVar('acceptedLangs')[0]; // Set first language available in app

          this.init();
        });
      }
      else {
        this.init();
      }

    })
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {
      this.analytics.trackPage('detail/'+this.navParams.get('id'));
    })

    // Translate back button for iOS
    this.viewCtrl.setBackButtonText(this.translated['Back']);
  }

  init() {
    // Translate strings and iOS Back button
    for(let valFrom of this.toTranslate) {
      this.translate.get(valFrom).subscribe(valTo => {
          this.translated[valFrom] = valTo;
      })
    }

    this.offlineData.initDB();
    this.offlineData.getFavorite(this.id).then((data) => { // Check if POI id is already saved into PouchDB
      if(data != false) {
        this.isFavorite = true;
        this.parseTemplateData(data); // Get data from PouchDB
      } else {
        this.isFavorite = false;
        this.getTemplateData(); // Get data from API
      }
    });

    // Mobile breakpoint: show/hide go to top button
    this.content.ionScrollEnd.subscribe((data)=>{
      if(document.getElementById('related-helper') && (data['scrollTop'] > document.getElementById('related-helper').offsetTop)) {
        this.relatedVisible = true;
      } else {
        this.relatedVisible = false;
      }

      this.ref.detectChanges();
    });
  }

  getTemplateData() {
    let lon = undefined;
    let lat = undefined;

    if(this.globalVars.isGeolocated()) {
      lon = this.globalVars.getVar('lon');
      lat = this.globalVars.getVar('lat');
    }

    this.loading = this.createLoader();
    this.loading.present();

    let lang = this.ionCurrentLang;

    this.poisData.getPoisDetail(this.id, false, lon, lat).then((data) => {

      for (let field in data) {
        if(field == 'contents') {
          for (let content in data[field]) {
            if(data[field][content]['locales']['code'] == lang) {
              this.poi['title'] = data[field][content]['title'];
              this.poi['excerpt'] = data[field][content]['excerpt'];
              this.poi['content'] = data[field][content]['content'];
            }
          }
        } else {
          this.poi[field] = data[field];
        }
      }
      this.poi['categoryLabel'] = this.getCategoryLabel(this.poi['category_id']);
      this.poi['urlNavigate'] = `https://maps.google.com/?q=${this.poi['lat']},${this.poi['lon']}`;
      this.poi['imagecount'] = this.poi['images'].length;

      for (let i=0; i<this.poi['images'].length; i++) {
        this.poi['images'][i]['image_url'] = this.poisData.getImageUrl(this.poi['images'][i]['image_id']);
      }

      // If online, gather related POIs
      if(this.globalVars.isDeviceConnected()) {
        this.showRelated = true;
        this.getRelated();
      }

      this.loading.dismiss();

    });

  }

  parseTemplateData(data) {
    let lang = this.ionCurrentLang;

    for (let field in data) {
      if(field == 'contents') { /// Is content text in different languages
        for (let contents in data[field]) {
          if(data[field][contents]['locales']['code'] == lang) {
            this.poi['title'] = data[field][contents]['title'];
            this.poi['excerpt'] = data[field][contents]['excerpt'];
            this.poi['content'] = data[field][contents]['content'];
          }
        }
      } else {
        this.poi[field] = data[field];
      }
    }

    this.poi['categoryLabel'] = this.getCategoryLabel(this.poi['category_id']);
    this.poi['imagecount'] = this.poi['images'].length;
    this.poi['urlNavigate'] = `https://maps.google.com/?q=${this.poi['lat']},${this.poi['lon']}`;

    for (let i=0; i<this.poi['images'].length; i++) {
      if(this.poi['images'][i]['image_base64'] !== null) this.poi['images'][i]['image_url'] = 'data:'+this.poi['images'][i]['image_mime']+';base64,'+this.poi['images'][i]['image_base64'];
    }

    this.poi['distance'] = this.getDistance(this.poi['lon'],this.poi['lat']);

    // If online, gather related POIs
    if(this.globalVars.isDeviceConnected()) {
      this.showRelated = true;
      this.getRelated();
    }
  }

  call(phone: string) {
    this.analytics.trackEvent('contact', 'phone');
    this.openUrl(`tel:${phone}`, false);
  }

  sendEmail(email: string) {
    this.analytics.trackEvent('contact', 'email');
    this.openUrl(`mailto:${email}`, false);
  }

  trackNavigate() {
    this.analytics.trackEvent('contact', 'directions');
    return true;
  }

  trackWeb() {
    this.analytics.trackEvent('contact', 'web');
    return true;
  }

  openWeb(web: string) {
    this.analytics.trackEvent('contact', 'web');
    this.openUrl(`${web}`);
  }

  addFavorite() {
    this.isFavorite = true; // Show it like favorite for optimistic UX
    this.analytics.trackEvent('favorites', 'add', this.poi['id']);

    this.offlineData.addFavorite(this.poi['id']).then((resp) => {
      this.isFavorite = resp;
    });
  }

  removeFavorite() {
    this.analytics.trackEvent('favorites', 'remove', this.poi['id']);

    this.offlineData.removeFavorite(this.poi['id']).then((resp) => {
      this.isFavorite = !resp;
    });
  }

  addFavoriteRelated(e, poiId) {
    if (this.globalVars.isDeviceConnected()) {
      this.showAsFavorite(poiId); // Show it like favorite for optimistic UX
      this.analytics.trackEvent('favorites', 'add', poiId);

      this.offlineData.addFavorite(poiId).then((resp) => {
        this.checkFavorites();
      });
    }

    e.stopPropagation();
  }

  removeFavoriteRelated(e, poiId) {
    this.analytics.trackEvent('favorites', 'remove', poiId);

    this.offlineData.removeFavorite(poiId).then((resp) => {
      this.checkFavorites();
    });

    e.stopPropagation();
  }

  goToDetail(id) {
    this.navCtrl.push(DetailPage, {
      id: id
    });
  }

  getCategoryLabel(categoryId) {
    let name = this.globalVars.getCategoryName(categoryId);
    if(name) {
      let htmlClass = "cat"+categoryId;
      return `<span class='${htmlClass}'>${name}</span>`;
    }
  }

  showSharingOptions() {
    this.analytics.trackEvent('share', 'openOptions');

    let shareUrl = encodeURIComponent(this.platform.url());
    let shareTitle = encodeURIComponent(this.poi['title']);

    let actionSheetOptions = {
      title: this.translated['Share']
    };

    actionSheetOptions['buttons'] = new Array(
      {
        text: 'Facebook',
        icon: 'logo-facebook',
        handler: () => {
          this.analytics.trackEvent('share', 'shareWith', 'Facebook');
          this.openUrl(`http://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, true, "facebook", 900, 500);
        }
      },
      {
        text: 'Twitter',
        icon: 'logo-twitter',
        handler: () => {
          this.analytics.trackEvent('share', 'shareWith', 'Twitter');
          this.openUrl(`https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`, true, "twitter", 650, 360);
        }
      },
      {
        text: 'Google+',
        icon: 'logo-googleplus',
        handler: () => {
          this.analytics.trackEvent('share', 'shareWith', 'Google+');
          this.openUrl(`https://plus.google.com/share?hl=es&url=${shareUrl}`, true, "googleplus", 500, 750);
        }
      },
      {
        text: 'Email',
        icon: 'mail',
        handler: () => {
          this.analytics.trackEvent('share', 'shareWith', 'email');
          this.openUrl(`mailto:?subject=${shareTitle}&body=${shareUrl}`, false);
        }
      });

    if((this.platform.is('mobile') || this.platform.is('mobileweb')) && !this.platform.is('tablet')) {
      actionSheetOptions['buttons'].push(
        {
          text: 'WhatsApp',
          icon: 'logo-whatsapp',
          handler: () => {
            this.analytics.trackEvent('share', 'shareWith', 'Whatsapp');
            this.openUrl(`whatsapp://send?text=${shareUrl}`, false);
          }
        }
      );
    }

    if(this.platform.is('ios')) {
      actionSheetOptions['buttons'].push(
        {
          text: this.translated['Cancel'],
          role: 'cancel',
          handler: () => {}
        }
      );
    }

    let actionSheet = this.actionSheetCtrl.create(actionSheetOptions);
    actionSheet.present();
  }

  getRelated() {
    let lang = this.ionCurrentLang;

    let categoryVal = this.poi['category_id'];
    let lon = this.poi['lon'];
    let lat = this.poi['lat'];

    this.poisData.getPoisList(4, 0, lon, lat, undefined, categoryVal).then((data) => {

      for (let info in data) {
        if(info == 'data') {

          let i = this.relatedPois.length;
          for (let poi in data[info]) {
            this.relatedPois.push({});

            for (let field in data[info][poi]) {
              if(field == 'contents') {
                for (let contents in data[info][poi][field]) {
                  if(data[info][poi][field][contents]['locales']['code'] == lang) {
                    this.relatedPois[i]['title'] = data[info][poi][field][contents]['title'];
                    this.relatedPois[i]['excerpt'] = data[info][poi][field][contents]['excerpt'];
                  }
                }
              } else {
                this.relatedPois[i] = data[info][poi];
              }
            }

            if(typeof this.relatedPois[i]['image_id'] != "undefined") this.relatedPois[i]['image_url'] = this.poisData.getImageUrl(this.relatedPois[i]['image_id']);
            this.relatedPois[i]['distance'] = this.getDistance(this.relatedPois[i]['lon'],this.relatedPois[i]['lat']);

            i++;
          }
        }
      }

      this.relatedPois.shift();

      this.checkFavorites();

    });

  }

  checkFavorites() { // Check if POI id is already saved into PouchDB
    for (let poi in this.relatedPois) {
      this.offlineData.getFavorite(this.relatedPois[poi].id).then((resp) => {
        if(resp != false) {
          this.relatedPois[poi].isFavorite = true;
        } else {
          this.relatedPois[poi].isFavorite = false;
        }
      });
    }
  }

  showAsFavorite(poiId) {
    for (let poi in this.relatedPois) {
      if(this.relatedPois[poi]['id'] == poiId) {
        this.relatedPois[poi].isFavorite = true;
        return;
      }
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

  createLoader() {
    return this.loadCtrl.create({
      dismissOnPageChange: false,
      content: this.translated['Loading']+'...'
    });
  }

  goScrollUp() {
    this.analytics.trackEvent('detail', 'goUp');

    if((this.content != null) && (!this.content.isScrolling)) {
      this.content.scrollToTop(200);
    }
  }

  openUrl(url, isPopup = false, name?, width?, height?) {
    if(this.platform.is('ios') && (typeof window.navigator['standalone'] !== "undefined")) { // Device is iOS
      if(window.navigator['standalone'] == true) { // Opened in browser as standalone
        window.open(url, '_top');
      }
      else {
        if(isPopup) {
          if((name != "") && (width != "") && (height != "")) window.open(url, name, "toolbar=0,status=0,width="+width+",height="+height);
          else window.open(url);
        }
        else {
          window.location.href = url;
        }
      }
    }
    else {
      if(isPopup) {
        if((name != "") && (width != "") && (height != "")) window.open(url, name, "toolbar=0,status=0,width="+width+",height="+height);
        else window.open(url);
      }
      else {
        window.location.href = url;
      }
    }
  }

}
