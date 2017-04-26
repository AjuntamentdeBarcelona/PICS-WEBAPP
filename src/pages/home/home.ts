import { Component, ViewChild, ElementRef, Renderer } from '@angular/core';
import { Content, NavController, NavParams, Platform, LoadingController, Segment, ViewController, PopoverController, ToastController } from 'ionic-angular';
import { TranslateService } from 'ng2-translate';

import { GlobalVars } from '../../providers/global-vars';
import { PoisData } from '../../providers/pois-data';
import { OfflineData } from '../../providers/offline-data';
import { Analytics } from '../../providers/analytics';

import { HomeMapPage } from '../home-map/home-map';
import { DetailPage } from '../detail/detail';
import { SearchPage } from '../search/search';
import { ErrorConnectPage } from '../error-connect/error-connect';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  @ViewChild(Content) content: Content;
  @ViewChild(Segment) segment: Segment;

  @ViewChild('scrollingTabs') scrollingTabs: ElementRef;
  @ViewChild('scrollingTabsLine') scrollingTabsLine: ElementRef;
  @ViewChild('moreOption') moreOption: ElementRef;
  @ViewChild('moreOptionLabel') moreOptionLabel: ElementRef;

  public category: any;
  pois: Array<any> = new Array();
  categories: Array<any> = new Array();
  categoriesDesktopMore: Array<any> = new Array(); // For the rest of categories ('more' popover)

  count: number = 12; // Default number of elements on list
  currentPage: number = 1;
  activeInfiniteScroll: boolean = false;
  ionCurrentLang: string = "";

  globalVars: GlobalVars;
  navbarColor: string;

  toTranslate = [
    'Loading',
    'All',
    'More',
    'Install this webapp tapping the share icon of browser and selecting Add to Home Screen'
  ]
  translated: any = {};

  loading: any;
  loadingActive: boolean = false;

  constructor(public navCtrl: NavController, public navParams: NavParams, public platform: Platform, private loadCtrl: LoadingController, public renderer: Renderer, public poisData: PoisData, public translate: TranslateService, public offlineData: OfflineData, public popoverCtrl: PopoverController, public analytics: Analytics, public toastCtrl: ToastController) {

      platform.ready().then(() => {
        this.globalVars = GlobalVars.getInstance();

        this.navbarColor = this.globalVars.getVar('navbarColor');
        this.offlineData.initDB();

        if(typeof this.navParams.data === 'string') this.category = this.navParams.data;
        else this.category = "0";

        setTimeout(() => { // Wait for app.component.ts to load current language
          this.globalVars.getUserLanguage().then((userLang) => {
            this.ionCurrentLang = userLang;

            let i=1;
            for(let valFrom of this.toTranslate) {
              this.translate.get(valFrom).subscribe(valTo => {
                this.translated[valFrom] = valTo;

                if(i>=this.toTranslate.length) { // Last item translated

                  if (this.globalVars.isDeviceConnected()) { // Load information only if device connected
                    // Update user location globals for first access
                    this.loading = this.createLoader();
                    this.loading.present();
                    this.globalVars.updateUserLocation().then((resp) => {
                      this.getTemplateData(true, true);
                    });
                  }

                }

              })
              i++;
            }
          })
        }, 500);

      });

  }

  ionViewWillEnter() {
    this.platform.ready().then(() => {

      this.analytics.trackPage('home');

      if (!this.globalVars.isDeviceConnected()) { // If no connection, show error page
        this.navCtrl.setRoot(ErrorConnectPage);
      }

      if(this.ionCurrentLang != "") { // If user have changed app language, data must be reloaded (no geolocalization)

        for(let valFrom of this.toTranslate) {
          this.translate.get(valFrom).subscribe(valTo => {
              this.translated[valFrom] = valTo;
          })
        }

        this.globalVars.getUserLanguage().then((userLang) => {
          if(this.ionCurrentLang != userLang) {
            this.ionCurrentLang = userLang;
            this.loading = this.createLoader();
            this.loading.present();
            this.getTemplateData(true, true);
          }
        });

      }

    })
  }

  getTemplateData(reload?: boolean, newCategories?: boolean, refresher?: any) {
    if(this.loadingActive) return; // Don't execute if process is already active

    this.loadingActive = true;

    let lon = undefined;
    let lat = undefined;

    if(!newCategories) {
      this.loading = this.createLoader();
      if(!refresher) this.loading.present();
    }

    if(newCategories) {
      this.getCategories();
    }

    if(reload) {
        this.currentPage = 1;
        while (this.pois.length) { this.pois.pop(); } // To empty current items
    }
    else {
      this.currentPage++;
    }

    let categoryVal = this.category;
    if(categoryVal == "0") categoryVal = undefined;

    if(this.globalVars.isGeolocated()) {
      lon = this.globalVars.getVar('lon');
      lat = this.globalVars.getVar('lat');
    }

    this.poisData.getPoisList(this.count, this.currentPage, lon, lat, undefined, categoryVal).then((data) => {

      for (let info in data) {
        if(info == 'data') {

          let i = this.pois.length;
          for (let poi in data[info]) {
            this.pois.push({});

            for (let field in data[info][poi]) {
              if(field == 'contents') {
                for (let contents in data[info][poi][field]) {
                  if(data[info][poi][field][contents]['locales']['code'] == this.ionCurrentLang) {
                    this.pois[i]['title'] = data[info][poi][field][contents]['title'];
                    this.pois[i]['excerpt'] = data[info][poi][field][contents]['excerpt'];
                  }
                }
              } else {
                this.pois[i] = data[info][poi];
              }
            }

            if(typeof this.pois[i]['image_id'] != "undefined") this.pois[i]['image_url'] = this.poisData.getImageUrl(this.pois[i]['image_id']);

            i++;
          }
        }
        else if(info == 'meta') {
          if(data[info]['pagination']['count'] < this.count) this.activeInfiniteScroll = false;
          else this.activeInfiniteScroll = true;
        }
      }

      this.checkFavorites();

      if(refresher) refresher.complete();
      else {
        this.loading.dismiss();

        this.showIosToastMessage();
      }

      this.loadingActive = false;
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
    let popover = this.popoverCtrl.create(HomePagePopover, {
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
    this.updateScrollingTabs();

    if((this.content != null) && (!this.content.isScrolling)) {
      this.content.scrollToTop(0);
    }

    this.getTemplateData(true, false, false);
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

  changeView() {
    this.navCtrl.setRoot(HomeMapPage, this.category); // Change to map view
  }

  showSearch() {
    this.navCtrl.push(SearchPage);
  }

  goToDetail(id) {
    this.navCtrl.push(DetailPage, {
      id: id
    });
  }

  doRefresh(refresher) {
    this.analytics.trackEvent('list', 'refresh');

    this.getTemplateData(true, false, refresher);
  }

  doInfinite(infiniteScroll) {
    this.analytics.trackEvent('list', 'paginate', this.currentPage);

    this.getTemplateData(false, false, infiniteScroll);
  }

  createLoader() {
    let options;
    if(this.translated['Loading'] == undefined) {
      options = {
        dismissOnPageChange: false
      }
    }
    else {
      options = {
        dismissOnPageChange: false,
        content: this.translated['Loading']+'...'
      }
    }
    return this.loadCtrl.create(options);
  }

  addFavorite(e, poiId) {
    this.showAsFavorite(poiId); // Show it like favorite for optimistic UX
    this.analytics.trackEvent('favorites', 'add', poiId);

    this.offlineData.addFavorite(poiId).then((resp) => {
      this.checkFavorites();
    });

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

  showIosToastMessage() {
    if(this.platform.is('ios') && (typeof window.navigator['standalone'] !== "undefined")) { // Device is iOS
      if(window.navigator['standalone'] != true) { // Opened in browser not as standalone
        this.globalVars.checkIosToastshown().then((iosToastshown) => {
          if(!iosToastshown) { // Toast not shown before
            const toast = this.toastCtrl.create({
              message: this.translated['Install this webapp tapping the share icon of browser and selecting Add to Home Screen'],
              showCloseButton: true,
              closeButtonText: 'OK'
            });
            toast.present();
            this.globalVars.setIosToastshown();
          }
        });
      }
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

export class HomePagePopover {

  categoriesDesktopMore: Array<any>;

  constructor(public viewCtrl: ViewController, public params: NavParams ) {
    this.categoriesDesktopMore = this.params.get('categoriesDesktopMore');
  }

  popoverSelect(categoryId) {
    this.viewCtrl.dismiss(categoryId);
  }

}
