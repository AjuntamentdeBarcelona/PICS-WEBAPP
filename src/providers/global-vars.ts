import { Network, Geolocation } from 'ionic-native';
import * as PouchDB from 'pouchdb';
import 'rxjs/add/operator/map';

interface ValueList {
     [index: string]: any;
}

export class GlobalVars {

  private _dbl;

  static instance : GlobalVars;
  static isCreating : Boolean = false;

  private dataVars = {} as ValueList;

  _categories: Array<any>;
  _favorites = [];
  _isConnected: boolean;
  HAS_ACCEPTED_COOKIES = 'hasAcceptedCookies';
  USER_LANGUAGE = 'lang';
  IOS_TOAST_SHOWN = 'iosToastShown';

  storage: Storage;

  constructor() {
    this._dbl = new PouchDB('pic_globalvars');
    this.dataVars['acceptedLangs'] = ['ca', 'es', 'en', 'fr']; // Languages accepted by app
    this.dataVars['geolocated'] = false;

    // Device connection handler:
    if(Network.type === 'none') this._isConnected = false;
    else this._isConnected = true;
  }

  static getInstance() : GlobalVars
  {
      if (GlobalVars.instance == null) GlobalVars.instance = new GlobalVars();
      return GlobalVars.instance;
  }

  setVar(key: string, val: any) {
    this.dataVars[key] = val;
  }

  getVar(key: string) {
    return this.dataVars[key];
  }

  isDeviceConnected() {
    return this._isConnected;
  }

  checkCookiesAccepted(): Promise<any> {
    return new Promise<any>((resolve, reject) => {

      this._dbl.get(this.HAS_ACCEPTED_COOKIES).then(function (doc) {
        resolve(doc.data);
      }).catch(function (err) {
        resolve(false);
      });

    });
  }

  setCookiesAccepted(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {

      let bdData = {
        _id: this.HAS_ACCEPTED_COOKIES,
        data: true
      }

      this._dbl.get(this.HAS_ACCEPTED_COOKIES)
        .then((doc) => { // It already exists

          this._dbl.remove(doc)
            .then((resp) => { // It already exists
              this._dbl.post(bdData).then(
                function(resp) {
                  resolve(true);
                },
                function(err) {
                  resolve(false);
                  console.log(err);
                }
              );
            })
            .catch((err) => {
              resolve(false);
              console.log(err);
            });

        })
        .catch((err) => { // It doesn't exists yet

          this._dbl.post(bdData).then(
            function(resp) {
              resolve(true);
            },
            function(err) {
              resolve(false);
              console.log(err);
            }
          );

        });

    });
  }

  getUserLanguage(): Promise<any> {
    return new Promise<any>((resolve, reject) => {

      this._dbl.get(this.USER_LANGUAGE).then(function (doc) {
        resolve(doc.data);
      }).catch(function (err) {
        resolve(false);
      });

    });
  }

  setUserLanguage(lang): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let bdData = {
        _id: this.USER_LANGUAGE,
        data: lang
      }

      this.setVar(this.USER_LANGUAGE,lang);

      this._dbl.get(this.USER_LANGUAGE)
        .then((doc) => { // It already exists

          this._dbl.remove(doc)
            .then((resp) => { // It already exists
              this._dbl.post(bdData).then(
                function(resp) {
                  resolve(true);
                },
                function(err) {
                  resolve(false);
                  console.log(err);
                }
              );
            })
            .catch((err) => {
              resolve(false);
              console.log(err);
            });

        })
        .catch((err) => { // It doesn't exists yet

          this._dbl.post(bdData).then(
            function(resp) {
              resolve(true);
            },
            function(err) {
              resolve(false);
              console.log(err);
            }
          );

        });

    });
  }

  updateUserLocation(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let options = {maximumAge:50000, timeout: 10000, enableHighAccuracy: true};

      Geolocation.getCurrentPosition(options).then((resp) => {
        this.setVar('geolocated',true);
        this.setVar('lat',resp.coords.latitude);
        this.setVar('lon',resp.coords.longitude);
        resolve(true);
      }).catch((error) => {
        resolve(false);
      });

    });
  }

  isGeolocated() {
    return this.getVar('geolocated');
  }

  updateCategories(categories) {
    this._categories = categories;
  }

  getCategoryName(categoryId, lang?) {
    if(lang === undefined) lang = this.getVar('lang');

    if(this._categories) {
      for (let i=0; i<this._categories.length; i++) {
        if(this._categories[i]['id'] == categoryId) return this._categories[i]['name'][lang];
      }
    }
  }

  isDNTActive() {
    return ((navigator['doNotTrack'] == "1") || (navigator['doNotTrack'] == "yes") || (window['doNotTrack'] == "1") || (window['doNotTrack'] == "yes") || (navigator['msDoNotTrack'] == "1"));
  }

  checkIosToastshown(): Promise<any> {
    return new Promise<any>((resolve, reject) => {

      this._dbl.get(this.IOS_TOAST_SHOWN).then(function (doc) {
        resolve(doc.data);
      }).catch(function (err) {
        resolve(false);
      });

    });
  }

  setIosToastshown(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {

      let bdData = {
        _id: this.IOS_TOAST_SHOWN,
        data: true
      }

      this._dbl.get(this.IOS_TOAST_SHOWN)
        .then((doc) => { // It already exists

          this._dbl.remove(doc)
            .then((resp) => { // It already exists
              this._dbl.post(bdData).then(
                function(resp) {
                  resolve(true);
                },
                function(err) {
                  resolve(false);
                  console.log(err);
                }
              );
            })
            .catch((err) => {
              resolve(false);
              console.log(err);
            });

        })
        .catch((err) => { // It doesn't exists yet

          this._dbl.post(bdData).then(
            function(resp) {
              resolve(true);
            },
            function(err) {
              resolve(false);
              console.log(err);
            }
          );

        });

    });
  }

  setConnectedVal(val: boolean) {
    this._isConnected = val;
  }

}
