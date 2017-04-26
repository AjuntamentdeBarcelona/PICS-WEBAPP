# PICS-WEBAPP #
**Version 1.0**

This is the frontend of the webapp 'Punts d'interès de ciutat' (City's Points of Interest) initially developed by [Metodian](https://metodian.com/) for [Ajuntament de Barcelona](http://www.barcelona.cat/) (Barcelona City Council). It is created with [Ionic 2](http://ionicframework.com/), a framework working on top of AngularJS. The directory structure is the Ionic standard, dividing page files (each page in a folder with SCSS, TS and HTML template files) and provider files.

### Development environment setup ###

1. Install latest version of [Node.js](https://nodejs.org/)
2. Execute command line: **npm install -g ionic cordova**
3. In project path, execute command line: **npm install**
4. In project path, execute command line: **cordova prepare**

### Config parameters ###

In **src/manifest.json**:

* **start_url**: Absolute URL of the index.html file (icons/src values should be edited too accordingly)

In **src/cache.manifest**:

* Edit lines into **NETWORK** section to add or remove whitelisted external domains including the webapp domain itself

In **src/providers/analytics.ts**:

* **gaUA**: UA tracking code for Google Analytics property. The Analytics property should be created for mobile apps (not web sites) and have a custom dimension with index 1, name 'language' and scope 'session'.

In **src/providers/pois-data.ts**:

* **apiURL**: URL of the [PICS-WEBAPP-API](https://github.com/AjuntamentdeBarcelona/PICS-WEBAPP-API). It can be absolute if is published into the same domain or it can be in another domain (always with HTTPS). Don't end the value with a slash.

### Translation ###
All translations are located in **src/assets/i18n**. There is a .json file for each locale. First value of each .json is the key of the copy into the webapp code.

### Development environment and testing ###
Ionic provides a temporary server to test the webapp locally while coding. Some functionality related to Cordova (like Google Analytics or network information) won't work in development environment.


```
ionic serve
```


### Deployment ###
First build the webapp with:

```
ionic build browser --prod
```

After the execution, built files are placed into the folder: **platforms/browser/www**
All files in this folder can be uploaded to web server. The webapp should be served with SSL.

To bear in mind:

* If index.html is not placed in the root of the domain, **/cordova.js** must be edited after building the app. In line 875 the reference to 'config.xml' file should be relative, adding a period before '/':

```
xhr.open("get", "./config.xml", true);
```
* Manifest and font files must be served with the corresponding mime type in HTTP/HTTPS response headers. A .htaccess example file for Apache servers is available in **/src** directory.

* If API is placed in another domain, its server must have [CORS](https://benjaminhorn.io/code/setting-cors-cross-origin-resource-sharing-on-apache-with-correct-response-headers-allowing-everything-through/) headers configured.

* After building the app with Ionic App Scripts 1.1.3, the generated script **build/main.js** includes a comment referring to an inexistent file in the last line. For some reason, Safari/iOS reads this line and tries to download the file, so it is recommended to remove the last line:
```
//# sourceMappingURL=main.js.map
```
