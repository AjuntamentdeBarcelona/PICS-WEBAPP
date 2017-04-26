import { Component, ViewChild, ElementRef, Renderer } from '@angular/core';
import { NavController, NavParams, Platform, LoadingController, Segment, ViewController, PopoverController } from 'ionic-angular';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../../providers/global-vars';
import { PoisData } from '../../providers/pois-data';
import { Analytics } from '../../providers/analytics';

import { HomePage } from '../home/home';
import { DetailPage } from '../detail/detail';
import { SearchPage } from '../search/search';
import { ErrorConnectPage } from '../error-connect/error-connect';

import 'leaflet';

@Component({
  selector: 'page-home-map',
  templateUrl: 'home-map.html'
})
export class HomeMapPage {
  @ViewChild(Segment) segment: Segment;

  @ViewChild('scrollingTabs') scrollingTabs: ElementRef;
  @ViewChild('scrollingTabsLine') scrollingTabsLine: ElementRef;
  @ViewChild('moreOption') moreOption: ElementRef;
  @ViewChild('moreOptionLabel') moreOptionLabel: ElementRef;

  category: any;
  pois: Array<any> = new Array();
  categories: Array<any> = new Array();
  categoriesDesktopMore: Array<any> = new Array(); // For the rest of categories ('more' popover)
  categoryIcons: Array<any> = new Array();
  categoryIconActive: any;
  lastMarker: any = undefined;

  count: number = 1000;
  ionCurrentLang: string = "";

  globalVars: GlobalVars;
  navbarColor: string;

  activeInfowindow: boolean = false;
  infowindow: any;

  map: any;
  markersLayer: Array<any> = new Array();

  toTranslate = [
    'Loading',
    'Getting location',
    'All',
    'More'
  ]
  translated: any = {};

  loading: any;

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform, private loadCtrl: LoadingController, public renderer: Renderer, public poisData: PoisData, public translate: TranslateService, public popoverCtrl: PopoverController, public analytics: Analytics) {

    platform.ready().then(() => {
      this.globalVars = GlobalVars.getInstance();

      for(let valFrom of this.toTranslate) {
        translate.get(valFrom).subscribe(valTo => {
            this.translated[valFrom] = valTo;
        })
      }

      this.createCategoryIcons();
      this.navbarColor = this.globalVars.getVar('navbarColor');

      if(typeof this.navParams.data === 'string') this.category = this.navParams.data;
      else this.category = "0";

      this.globalVars.getUserLanguage().then((userLang) => {
        this.ionCurrentLang = userLang;
        this.loadMap();
      })

    })
  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {

      this.analytics.trackPage('home/map');

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
            this.getTemplateData(true, true);
          }
        });

      }

    })
  }

  getTemplateData(reload?: boolean, newCategories?: boolean) {
    this.loading = null;
    this.loading = this.createLoader('Loading');
    this.loading.present();

    if(reload) while (this.pois.length) { this.pois.pop(); } // To empty current items

    if (newCategories) this.getCategories();

    let categoryVal = this.category;
    if(categoryVal == "0") categoryVal = undefined;

    this.poisData.getPoisList(this.count, 0, undefined, undefined, undefined, categoryVal).then((data) => {

      let i = this.pois.length;
      for (let poi in data['data']) {
        this.pois.push({});

        for (let field in data['data'][poi]) {
          if(field == 'contents') {
            for (let contents in data['data'][poi][field]) {
              if(data['data'][poi][field][contents]['locales']['code'] == this.ionCurrentLang) {
                this.pois[i]['title'] = data['data'][poi][field][contents]['title'];
                this.pois[i]['excerpt'] = data['data'][poi][field][contents]['excerpt'];
              }
            }
          } else {
            this.pois[i] = data['data'][poi];
          }
        }

        if(typeof this.pois[i]['image_id'] != "undefined") this.pois[i]['image_url'] = this.poisData.getImageUrl(this.pois[i]['image_id']);

        i++;
      }

      this.placeMapMarkers();

      this.loading.dismiss();

    });

  }

  getCategories() {
    while (this.categories.length) { this.categories.pop(); } // To empty current items

    this.poisData.getCategories().then((data) => {

      // Mobile segment
      this.categories.push( // Add 'All' first option
        {
          id: 0,
          name: this.translated['All']
        }
      )
      for (let category in data) {
        data[category]['tmp'] = data[category]['name'][this.globalVars.getVar('lang')];
        data[category]['name'] = data[category]['tmp'];
        this.categories.push(data[category]);
      }

      // Desktop 'more' popover
      while (this.categoriesDesktopMore.length) { this.categoriesDesktopMore.pop(); } // To empty current items

      for (let i=5; i<this.categories.length; i++) {
        this.categoriesDesktopMore.push(this.categories[i]);
      }

      setTimeout(() => {
        if (this.segment) {
            this.segment._buttons.forEach(button => {
                button.ionSelect.observers.pop();
            });
            this.segment.ngAfterViewInit();
            this.updateScrollingTabs();
        }
      });

    });
  }

  loadMap() {
    // Init map object
    this.map = L.map('map', { attributionControl:false });

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

    // Set event triggers
    this.map.on('click', this.hideInfowindow.bind(this));
    this.map.on('locationfound', this.onUserLocated.bind(this));
    this.map.on('locationerror', this.onUserLocationError.bind(this));
    this.map.on('zoomend', this.placeMapMarkers.bind(this)); // Update markers on zoom
    this.map.on('dragend', this.placeMapMarkers.bind(this)); // Update markers on drag

    this.getTemplateData(true, true);
  }

  placeMapMarkers() {
    let tempIcon;
    let tempMarker;

    this.markersLayer.forEach(marker => {
      this.map.removeLayer(marker);
    });

    this.markersLayer = new Array(); // To empty current items

    let mapBounds = this.map.getBounds();

    this.pois.forEach(markerData => {
      let latlng = L.latLng(markerData.lat,markerData.lon);

      if((markerData.category_id > 0) && (markerData.category_id < 11) && mapBounds.contains(latlng)) {
        tempIcon = L.icon(this.categoryIcons[markerData.category_id]);
        tempMarker = L.marker([markerData.lat,markerData.lon], {icon: tempIcon}).addTo(this.map).on('click', this.showInfowindow, this);
        tempMarker._poiId = markerData.id;
        tempMarker._catId = markerData.category_id;
        this.markersLayer.push(tempMarker);
      }
    });
  }

  getPositionCategory(categoryID) {
    for (let i=0; i<this.categories.length; i++) {
      if(this.categories[i]['id'] == categoryID) return i;
    }
  }

  getCategoryLabel(categoryId) {
    let name = this.globalVars.getCategoryName(categoryId);
    let htmlClass = "cat"+categoryId;
    return `<span class='${htmlClass}'>${name}</span>`;
  }

  openDesktopMoreCategories(ev) {
    let popover = this.popoverCtrl.create(HomeMapPagePopover, {
        categoriesDesktopMore: this.categoriesDesktopMore
    });
    popover.onDidDismiss(data => {
      if(data && (this.category != data)) {
        this.category = data.toString();
        this.tabSelect();
      }
    });
    popover.present({ ev: ev });
    ev.stopPropagation();
  }

  tabSelect() {
    this.analytics.trackEvent('categoryTabs', this.category);

    this.activeInfowindow = false;
    this.updateScrollingTabs();
    this.getTemplateData(true);
  }

  updateScrollingTabs() {
    // Change component to show selection
    let windowWidth: number = this.platform.width();
    let nextPosition: number = this.getPositionCategory(this.category);

    if((this.platform.is('mobile') || this.platform.is('mobileweb')) && !this.platform.is('tablet')) {
      this.scrollingTabs.nativeElement.scrollLeft = Math.round(((nextPosition * 100) + 50) - (windowWidth / 2));
    }
    else {
      if(nextPosition>=5) {
        nextPosition = 5;
        this.moreOptionLabel.nativeElement.textContent = this.globalVars.getCategoryName(this.category);
        this.renderer.setElementClass(this.moreOption.nativeElement, 'segment-activated', true);
      }
      else {
        this.moreOptionLabel.nativeElement.textContent = this.translated['More'];
        this.renderer.setElementClass(this.moreOption.nativeElement, 'segment-activated', false);
      }
    }
    this.renderer.setElementStyle(this.scrollingTabsLine.nativeElement, 'left', (nextPosition * 100) + 'px');
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

  changeView() {
    this.navCtrl.setRoot(HomePage, this.category); // Change to list view
  }

  showSearch() {
    this.navCtrl.push(SearchPage);
  }

  goToDetail(id) {
    this.navCtrl.push(DetailPage, {
      id: id
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

}


// Popover content for Desktop tabs

@Component({
  template: `
    <ion-list (categoryChanged)="rebut($event)">
      <button ion-item *ngFor="let categoryItem of categoriesDesktopMore" (click)="popoverSelect(categoryItem.id)">{{categoryItem.name}}</button>
    </ion-list>
  `
})

export class HomeMapPagePopover {

  categoriesDesktopMore: Array<any>;

  constructor(public viewCtrl: ViewController, public params: NavParams ) {
    this.categoriesDesktopMore = this.params.get('categoriesDesktopMore');
  }

  popoverSelect(categoryId) {
    this.viewCtrl.dismiss(categoryId);
  }

}
