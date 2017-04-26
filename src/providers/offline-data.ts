import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import * as PouchDB from 'pouchdb';
import 'rxjs/add/operator/map';

import { GlobalVars } from './global-vars';
import { PoisData } from './pois-data';

@Injectable()
export class OfflineData {

  private _db;
  private _dbs;

  globalVars: GlobalVars;

  constructor(public platform: Platform, public poisData: PoisData) {
    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
    }).catch((e) => {
      console.error(e);
    })
  }

  initDB() {
      this._db = new PouchDB('pic_favorites'); // DB Favorites
      this._dbs = new PouchDB('pic_searches'); // DB Searches
  }

  addFavorite(favoriteId): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {

      let lat = this.globalVars.getVar('lat');
      let lon = this.globalVars.getVar('lon');

      this.poisData.getPoisDetail(favoriteId, true, lon, lat).then((data) => {

        if(typeof favoriteId == 'number') favoriteId = favoriteId.toString();

        data['categoryLabel'] = this.getCategoryLabels(['category_id']);
        data['distance'] = undefined;

        let bdData = {
          _id: favoriteId,
          data: JSON.stringify(data) // All data is serialized into a JSON to avoid handling sub objects
        }

        this._db.post(bdData).then(function (response) {
          resolve(true);
        }).catch(function (err) {
          resolve(false);
        });

      });

    });
  }

  removeFavorite(favoriteId): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {

      if(typeof favoriteId == 'number') favoriteId = favoriteId.toString();

      this._db.get(favoriteId).then(doc => {

        this._db.remove(doc).then(function (resp) {
          resolve(true);
        }).catch(function (err) {
          console.log(err);
          resolve(false);
        });

      });

    });
  }

  getFavorite(favoriteId): Promise<any> {
    return new Promise<any>((resolve, reject) => {

      if(typeof favoriteId == 'number') favoriteId = favoriteId.toString();

      this._db.get(favoriteId).then(function (doc) {
        resolve(JSON.parse(doc.data));
      }).catch(function (err) {
        resolve(false);
      });

    });
  }

  getAllFavorites() {
    let data;
    return this._db.allDocs({ include_docs: true }).then(docs => {

      data = docs.rows.map(row => {
        return JSON.parse(row.doc.data);
      });

      return data;
    });
  }

  removeAllFavorites(): Promise<void> {
    return new Promise<void>((resolve) => {

      this._db.allDocs({ include_docs: false }).then(docs => {

        docs.rows.map(row => {

          this._db.remove(row.id, row.value.rev).catch(function (err) {
          });

        });
        resolve();

      });
    });
  }

  saveSearch(poi_id, poi_title): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {

      if(typeof poi_id == 'number') poi_id = poi_id.toString();

      let bdData = {
        _id: poi_id,
        id: poi_id,
        title: poi_title
      }

      this._dbs.post(bdData).then(function (response) {
        resolve(true);
      }).catch(function (err) {
        resolve(false);
      });

    });

  }

  getAllSearches() {
    let data;
    return this._dbs.allDocs({ include_docs: true }).then(docs => {

      data = docs.rows.map(row => {
        return row.doc;
      });

      return data;
    });
  }

  getCategoryLabels(categoryId) {
    let categoryLabels = {};
    let acceptedLangs = this.globalVars.getVar('acceptedLangs');
    let htmlClass = "cat"+categoryId;

    acceptedLangs.forEach(lang => {
        categoryLabels[lang] = `<span class='${htmlClass}'>${this.globalVars.getCategoryName(categoryId,lang)}</span>`
    });

    return categoryLabels;
  }

}
