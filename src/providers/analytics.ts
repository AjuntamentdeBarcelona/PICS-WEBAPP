import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import { GoogleAnalytics, Network } from 'ionic-native';
import * as PouchDB from 'pouchdb';

import { GlobalVars } from './global-vars';

@Injectable()
export class Analytics {

  // TO EDIT:
  private gaUA = 'UA-XXXXXXXX-X';
  private appName = 'PICS';
  private appVersion = '1.0.0';

  private _ga;
  private _dbga;
  private _connectSubscription;
  globalVars: GlobalVars;

  constructor(public platform: Platform) {
    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
      this._dbga = new PouchDB('pic_ga');
    }).catch((e) => {
      console.error(e);
    })
  }

  init() {
    GoogleAnalytics.startTrackerWithId(this.gaUA)
     .then(() => {

       // Init GoogleAnalytics object
       this._ga = window['nativeGa']; // default ga object of GoogleAnalytics plugin
       this._ga('create', this.gaUA, {'name': 'appga'});
       this._ga('appga.set', 'appName', this.appName);
       this._ga('appga.set', 'appVersion', this.appVersion);

       this.globalVars.getUserLanguage().then((userLang) => {
         if(!userLang) userLang = window.navigator.language.split('-')[0]; // Set language depending on browser's locale
         if(!userLang || (this.globalVars.getVar('acceptedLangs').lastIndexOf(userLang) == -1)) userLang = this.globalVars.getVar('acceptedLangs')[0]; // Set first language available in app
         this._ga('appga.set', 'dimension1', userLang);  // Send user dimension 1 (language)
       })

       // Subscribe to event when connection is available again
       this._connectSubscription = Network.onConnect().subscribe(() => {
         setTimeout(() => { // Wait for connection to be ready
           this.sendQueue();
         }, 3000);
       });

     })
     .catch((e) => {
       console.log('Error starting Google Analytics: ', e)
     })
  }

  trackPage(page) {
    if (!this.globalVars.isDNTActive()) { // If no DNT active, track Analytics
      if(!this.globalVars.isDeviceConnected()) { // No connection, save hit
        let hitObj = {
          hitType: 'screenview',
          page: page
        }
        this.saveHit(hitObj);
      }
      else {
        this.gaTrackPage(page); // Connection, send hit
      }
    }
  }

  trackEvent(eventCategory, eventAction, eventLabel?) {
    if (!this.globalVars.isDNTActive()) { // If no DNT active, track Analytics

      if (typeof eventAction == 'number') eventAction = eventAction.toString();
      if (typeof eventLabel == 'number') eventLabel = eventLabel.toString();

      if(!this.globalVars.isDeviceConnected()) { // No connection, save hit
        let hitObj = {
          hitType: 'event',
          eventCategory: eventCategory,
          eventAction: eventAction,
          eventLabel: eventLabel
        }
        this.saveHit(hitObj);
      }
      else {
        this.gaTrackEvent(eventCategory, eventAction, eventLabel); // Connection, send hit
      }
    }
  }

  gaTrackPage(page, qt=0) {
    if(typeof this._ga != "function") this._ga = window['nativeGa']; // default ga object of GoogleAnalytics plugin

    let fieldsObject = {
      appName: this.appName,
      hitType: 'screenview',
      screenName: page,
      '&qt': qt
    };
    try {
      this._ga('appga.send', fieldsObject);
    } catch (err) {
      console.log(err);
    }
  }

  gaTrackEvent(eventCategory, eventAction, eventLabel?, qt=0) {
    if(typeof this._ga != "function") if(typeof this._ga != "function") this._ga = window['nativeGa']; // default ga object of GoogleAnalytics plugin

    let fieldsObject = {
      hitType: 'event',
      eventCategory: eventCategory,
      eventAction: eventAction,
      eventLabel: eventLabel,
      '&qt': qt
    };
    try {
      this._ga('appga.send', fieldsObject);
    } catch (err) {
      console.log(err);
    }
  }

  saveHit(hitObj) { // Save hits to PouchDB
    let timestamp = new Date().getTime(); // Get current time in milliseconds

    hitObj['timestamp'] = timestamp; // Save timestamp into object

    let bdData = {
      _id: timestamp.toString(), // Use timestamp as ID
      data: hitObj
    }

    this._dbga.post(bdData).then(
      function(resp) {
        return(true);
      },
      function(err) {
        console.log(err);
        return(false);
      }
    );
  }

  sendQueue() { // When connected, send all saved hits and empty database
    this._dbga.allDocs({ include_docs: true }).then(docs => {

      let timestamp = new Date().getTime(); // Get current time in milliseconds

      docs.rows.map(row => {

        for (let hit in row.doc) { // in row.doc.data
          if(typeof row.doc[hit]['hitType'] != 'undefined') {
            let qt = (timestamp - row.doc[hit]['timestamp']);

            if(qt < (28 * 60 * 60 * 1000)) { // Only hits from last 28 hours can be sent to Analytics
              if(row.doc[hit]['hitType'] == 'screenview') { // is screenview
                this.gaTrackPage(row.doc[hit]['page'], qt);
              }
              else { // is event
                this.gaTrackEvent(row.doc[hit]['eventCategory'], row.doc[hit]['eventAction'], row.doc[hit]['eventLabel'], qt);
              }
            }

            this._dbga.remove(row.id, row.value.rev).catch(function (err) {
              console.log(err);
            });
          }
        }

      });

    });
  }

}
