import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';
import { Http, Headers, RequestOptions } from '@angular/http';
import 'rxjs/add/operator/map';

import { GlobalVars } from './global-vars';

declare function escape(s:string): string;

@Injectable()
export class PoisData {

  // TO EDIT:
  // API URL. Use HTTPS to avoid mixted content error
  apiURL: string = 'https://example.org'; // No end for slash

  globalVars: GlobalVars;

  constructor(public http: Http, public platform: Platform) {
    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();
    }).catch((e) => {
      console.error(e);
    })
  }

  getPoisList(count:number, page:number, lon?:number, lat?:number, district?:number, category?:number): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {

      let langVar = this.globalVars.getVar('lang');

      // Configure URL for the API's endpoint
      let apiEndpointUrl = this.apiURL+'/pois';
      apiEndpointUrl += '?count='+count;
      apiEndpointUrl += '&page='+page;
      if((typeof lon != 'undefined') && (typeof lat != 'undefined')) apiEndpointUrl += '&lon='+lon+'&lat='+lat;
      if(typeof district != 'undefined') apiEndpointUrl += '&district='+district;
      if(typeof category != 'undefined') apiEndpointUrl += '&category='+category;
      apiEndpointUrl += '&_language='+langVar; // Variable to avoid cache between Accept-Language headers

      let headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': langVar
      });
      let options = new RequestOptions({ headers: headers });

      this.http.get(apiEndpointUrl, options)
        .map(res => res.json()).subscribe(
          data => {
            resolve(data);
          },
          err => {
            console.log(err);
            resolve();
          }
      );

    });
  }

  getPoisDetail(id:string, allLangs:boolean = false, lon?:number, lat?:number): Promise<any> {
    return new Promise<any>((resolve, reject) => {

      let langVar = this.globalVars.getVar('lang');
      if(allLangs) langVar = this.globalVars.getVar('acceptedLangs');

      // Configure URL for the API's endpoint
      let apiEndpointUrl = this.apiURL+'/pois/'+id+'?';
      //if(allLangs) apiEndpointUrl += 'lang='+langVar+'&'; // Alternative to Content-Type in API
      if(typeof lon != 'undefined') {
          apiEndpointUrl += 'lon='+lon;
          if(typeof lat != 'undefined') apiEndpointUrl += '&lat='+lat;
      }
      apiEndpointUrl += '&_language='+langVar; // Variable to avoid cache between Accept-Language headers

      let headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': langVar
      });
      let options = new RequestOptions({ headers: headers });

      this.http.get(apiEndpointUrl, options)
        .map(res => res.json()).subscribe(
          data => {

            // Get HTML contents for each language

            let apiEndpointContentUrl = this.apiURL+'/pois/'+id+'/body';
            let langList;

            if(!allLangs) langList = new Array (langVar);
            else langList = langVar;

            let i = 1;

            for(let lang in langList) {

              let contentHeaders = new Headers({
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept-Language': langList[lang]
              });
              let contentOptions = new RequestOptions({ headers: contentHeaders });

              this.http.get(apiEndpointContentUrl, contentOptions)
                .map(contentRes => contentRes).subscribe(contentData => {
                  for (let field in data['data'][0]) {
                    if(field == 'contents') {
                      for (let content in data['data'][0][field]) {
                        if(data['data'][0][field][content]['locales']['code'] == langList[lang]) {
                          data['data'][0][field][content]['content'] = contentData['_body'];
                        }
                      }
                    }
                  }

                  if(i == langList.length) resolve(data['data'][0]);

                  i++;
                });

            }
          },
          err => {
            console.log(err);
            resolve();
          }
      );

    });
  }

  getPoisSearch(q:string): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {

      let langVar = this.globalVars.getVar('lang');

      // Configure URL for the API's endpoint
      let apiEndpointUrl = this.apiURL+'/pois/search';
      apiEndpointUrl += '?q='+q;
      apiEndpointUrl += '&_language='+langVar; // Variable to avoid cache between Accept-Language headers

      let headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': langVar
      });
      let options = new RequestOptions({ headers: headers });

      this.http.get(apiEndpointUrl, options)
        .map(res => res.json()).subscribe(
          data => {
            resolve(data);
          },
          err => {
            console.log(err);
            resolve();
          }
      );

    });
  }

  getCategories(allLangs?, district?:number): Promise<any[]> {

    return new Promise<any[]>((resolve, reject) => {

      let langVar = this.globalVars.getVar('lang');
      if(allLangs) langVar = this.globalVars.getVar('acceptedLangs');

      // Configure URL for the API's endpoint
      let apiEndpointUrl = this.apiURL+'/categories';
      let apiEndpointVars = '';
      //if(allLangs) apiEndpointVars += 'lang='+langVar+'&'; // Alternative to Content-Type in API
      if(typeof district != 'undefined') apiEndpointVars += 'district='+district;

      if(apiEndpointVars != '')  {
        apiEndpointUrl += '?'+apiEndpointVars;
        apiEndpointUrl += '&_language='+langVar; // Variable to avoid cache between Accept-Language headers
      }
      else {
        apiEndpointUrl += '?_language='+langVar; // Variable to avoid cache between Accept-Language headers
      }

      let headers = new Headers({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Language': langVar
      });
      let options = new RequestOptions({ headers: headers });

      this.http.get(apiEndpointUrl, options)
        .map(res => res.json()).subscribe(
          data => {
            resolve(data);
          },
          err => {
            console.log(err);
            resolve();
          }
      );

    });
  }

  getImageUrl(id:string) {
    return this.apiURL+'/image/'+id;
  }

}
