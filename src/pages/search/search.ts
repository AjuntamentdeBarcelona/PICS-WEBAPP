import { Component } from '@angular/core';
import { Platform, NavController, NavParams } from 'ionic-angular';

import { PoisData } from '../../providers/pois-data';
import { OfflineData } from '../../providers/offline-data';
import { Analytics } from '../../providers/analytics';

import { DetailPage } from '../detail/detail';

@Component({
  selector: 'page-search',
  templateUrl: 'search.html'
})
export class SearchPage {

  formData = {};
  noResultsMessage: boolean = false;

  pois = [];

  constructor(public platform: Platform, public navCtrl: NavController, public navParams: NavParams, public poisData: PoisData, public offlineData: OfflineData, public analytics: Analytics) {
    this.formData['q'] = '';

    platform.ready().then(() => {
      this.getSearchHistory();
    })
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {
      this.analytics.trackPage('search');
    })
  }

  getSearchHistory() {
    this.formData['q'] = '';
    this.noResultsMessage = false; // Hide no results message
    while (this.pois.length) { this.pois.pop(); } // Empty current result items

    this.offlineData.getAllSearches().then((data) => {

      for (let i=0; i<data.length; i++) {
        this.pois.push({});
        for (let field in data[i]) {
          this.pois[i][field] = data[i][field];
        }
        this.pois[i]['icon']= 'icon-pic_history';
      }

    });
  }

  doSearch(e: any) {
    let q = e.target.value;

    while (this.pois.length) { this.pois.pop(); } // Empty previous list of items

    if (q && (q.trim() != '') && (q.length > 2)) {

      this.analytics.trackEvent('search', 'query', q);

      this.poisData.getPoisSearch(q).then((data) => {

        if(data && data['data'].length>0) { // Results found
          this.noResultsMessage = false; // Hide no results message

          for (let i=0; i<data['data'].length; i++) {
            this.pois.push({});
            for (let field in data['data'][i]) {
              this.pois[i][field] = data['data'][i][field];

              if(field=='title') { // Highlight query text into title
                let firstChar, lastChar, tempTitle;
                firstChar = this.pois[i]['title'].toLowerCase().indexOf(q.toLowerCase());
                if(firstChar > -1) {
                  lastChar = firstChar + q.length;
                  tempTitle = this.pois[i]['title'].substring(0,firstChar)+'<b>'+this.pois[i]['title'].substring(firstChar,lastChar)+'</b>'+this.pois[i]['title'].substring(lastChar,this.pois[i]['title'].length);
                  this.pois[i]['title'] = tempTitle;
                }
              }
            }
            this.pois[i]['icon']= 'icon-pic_pin';
          }
        }
        else { // No results
          this.noResultsMessage = true; // Show no results message
        }


      });

    }
    else if(q.trim() == '') {
      this.getSearchHistory();
    }
  }

  searchCancel() {
    this.navCtrl.pop();
  }

  goToDetail(id, title) {
    this.analytics.trackEvent('search', 'selectResult', id);

    this.offlineData.saveSearch(id, title.replace(/<(?:.|\n)*?>/gm, '')); // Remove highlighted HTML from result title
    this.navCtrl.push(DetailPage, {
      id: id
    });
  }

}
