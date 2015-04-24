(function() {
  /* jshint browser: true */
  /* global VAPI */
  var Verold = window.verold = window.verold || {},
      isAbsoluteRegex = new RegExp("^(?:/|.+://)"),
      files = {};

  function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
  }

  function relative(path, relativeTo) {
    if (typeof relativeTo !== 'string' || relativeTo.length === 0 || isAbsoluteRegex.test(path)) {
      return path;
    } else {
      return relativeTo + (relativeTo.substr(-1) === '/' ? '' : '/') +  path;
    }
  }

  function loadHTML(url, callback) {
    var request = new XMLHttpRequest(),
        onLoad,
        loaded = false;

    request.open('GET', url, true);

    onLoad = function() {
      if (!loaded) {
        loaded = true;
        if (request.status >= 200 && request.status < 400){
          callback(null, request.responseText);
        } else {
          callback(null, undefined);
        }
      }
    };

    request.onreadystatechange = function() {
      if ( request.readyState === 4 ) {
        onLoad();
      }
    };

    request.onload = onLoad;

    request.onerror = function(err) {
      callback(err);
    };

    request.send();
  }

  function loadJS(url, callback) {
    if (!files[url]) {
      var script = document.createElement('script');
      script.setAttribute('type', 'application/javascript');
      script.setAttribute('src', url);
      document.getElementsByTagName('head')[0].appendChild(script);

      files[url] = {
        listeners: [],
        loaded: false
      };

      script.onload = function() {
        files[url].loaded = true;
        files[url].listeners.forEach(function(fn) {
          fn();
        });
        files[url].listeners = [];
      };

      files[url].listeners.push(callback);
    } else {
      if (files[url].loaded) {
        callback();
      } else {
        files[url].listeners.push(callback);
      }
    }
  }

  function loadCSS(url, callback) {
    if (!files[url]) {
      var link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('type', 'text/css');
      link.setAttribute('href', url);
      document.getElementsByTagName('head')[0].appendChild(link);

      files[url] = {
        listeners: [],
        loaded: false
      };

      link.onload = function() {
        files[url].loaded = true;
        files[url].listeners.forEach(function(fn) {
          fn();
        });
        files[url].listeners = [];
      };

      files[url].listeners.push(callback);
    } else {
      if (files[url].loaded) {
        callback();
      } else {
        files[url].listeners.push(callback);
      }
    }
  }

  function loadJSON(url, callback) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);

    request.onreadystatechange = function() {
      if ( request.readyState === 4 ) {
        if (request.status >= 200 && request.status < 400){
          var data = JSON.parse(request.responseText);

          callback(null, data);
        } else {
          callback(null, undefined);
        }
      }
    };

    request.onerror = function(err) {
      callback(err);
    };

    request.send();
  }

  function loadApp(selector, config, opts, fn) {
    /* jshint unused: false */
    var versionNumbers = config.config.runtimeVersion.split('.'),
        major = parseInt(versionNumbers[0]),
        minor = parseInt(versionNumbers[1]),
        patch = parseInt(versionNumbers[2]);

    switch(minor) {
      case 7:
        loadApp062(selector, config, opts, fn); 
        break;
      case 6:
        switch(patch) {
          case 0:
            loadApp060(selector, config, opts, fn);
            break;
          case 1:
            loadApp061(selector, config, opts, fn);
            break;
          default:
            loadApp062(selector, config, opts, fn);
            break;
        }
        break;
      default:
        loadApp05x(selector, config, opts, fn);
        break;
    }
  }

  function loadAppHtmlCssJson(selector, config, opts, done) {
    var toLoad = 4,
        loadedCount = 0,
        projectData = { settings: config.application.settings, project: config.project },
        el = document.querySelector(selector);

    if (!el) {
      console.error('Could not find element matching selector: ' + selector);
      return;
    }

    var baseUrl = opts.baseUrl || '.';

    Verold.apiBaseUrl = relative(config.config.apiBaseUrl, baseUrl);
    Verold.assetsBaseUrl = relative(config.config.assetsBaseUrl, baseUrl);
    Verold.staticBaseUrl = relative(config.config.staticBaseUrl, baseUrl);
    Verold.glAssetsBaseUrl = relative(config.config.glAssetsBaseUrl, baseUrl);

    if (window.require) {
      require([Verold.assetsBaseUrl + '/runtime/verold-runtime-requirejs-' + config.config.runtimeVersion + (opts.development || config.config.development ? '.js' : '.min.js') ], function() {
        require(['VeroldEngine/VAPI'], function(VAPI) {
          loadedCount++;
          if (loadedCount >= toLoad) {
            done(baseUrl, projectData);
          }
        });
      });
    } else {
      loadJS(Verold.assetsBaseUrl + '/runtime/verold-runtime-' + config.config.runtimeVersion + (opts.development || config.config.development ? '.js' : '.min.js'), function() {
        loadedCount++;
        if (loadedCount >= toLoad) {
          done(baseUrl, projectData);
        }
      });
    }

    loadCSS(relative(config.resources.css, baseUrl), function() {
      loadedCount++;
      if (loadedCount >= toLoad) {
        done(baseUrl, projectData);
      }
    });

    loadJSON(relative(config.resources.entities, baseUrl), function(err, entities) {
      projectData.entities = entities;

      loadedCount++;

      if (loadedCount >= toLoad) {
        done(baseUrl, projectData);
      }
    });

    loadHTML(relative(config.resources.html, baseUrl), function(err, html) {
      el.innerHTML += html;

      loadedCount++;

      if (loadedCount >= toLoad) {
        done(baseUrl, projectData);
      }
    });
  }

  function loadAppJson(config, opts, done) {
    var toLoad = 2,
        loadedCount = 0,
        projectData = { settings: config.application.settings, project: config.project };

    var baseUrl = opts.baseUrl || '.';

    Verold.apiBaseUrl = relative(config.config.apiBaseUrl, baseUrl);
    Verold.assetsBaseUrl = relative(config.config.assetsBaseUrl, baseUrl);
    Verold.staticBaseUrl = relative(config.config.staticBaseUrl, baseUrl);
    Verold.glAssetsBaseUrl = relative(config.config.glAssetsBaseUrl, baseUrl);

    if (!window.VAPI) {
      if (window.require) {
        require([ Verold.assetsBaseUrl + '/runtime/verold-runtime-requirejs-' + config.config.runtimeVersion + (opts.development || config.config.development ? '.js' : '.min.js') ], function() {
          require(['VeroldEngine/VAPI'], function(VAPI) {
            loadedCount++;
            if (loadedCount >= toLoad) {
              done(baseUrl, projectData);
            }
          });
        });
      } else {
        loadJS(Verold.assetsBaseUrl + '/runtime/verold-runtime-' + config.config.runtimeVersion + (opts.development || config.config.development ? '.js' : '.min.js'), function() {
          loadedCount++;
          if (loadedCount >= toLoad) {
            done(baseUrl, projectData);
          }
        });
      }
    } else {
      loadedCount++;
      if (loadedCount >= toLoad) {
        done(baseUrl, projectData);
      }
    }

    loadJSON(relative(config.resources.entities, baseUrl), function(err, entities) {
      projectData.entities = entities;

      loadedCount++;

      if (loadedCount >= toLoad) {
        done(baseUrl, projectData);
      }
    });
  }

  function loadApp060(selector, config, opts, fn) {
    loadAppHtmlCssJson(selector, config, opts, function(baseUrl, projectData) {
      var entities = new VAPI.EntityCollection(projectData.entities);
      var applicationEntity = entities.get(projectData.project.startupApplicationId);
      var selector = applicationEntity && applicationEntity.get('payload.container') || '#verold3d';
      var engineName = applicationEntity && applicationEntity.get('payload.engineName') || 'Default';
      var useLoader = applicationEntity && applicationEntity.get('payload.useVeroldLoader') || true;
      var startupScene = applicationEntity && applicationEntity.get('payload.loadStartupScene');
      var applicationAsset;

      var veroldEngine = new VAPI.Engine({
        'engineName': engineName,
        'container': document.querySelector(selector)
      });

      veroldEngine.initialize({
        entities: entities,
        componentSettings: { runtime: true }
      });

      applicationAsset = veroldEngine.assetRegistry.assets[applicationEntity.id];

      if ( useLoader ) {
        applicationAsset.addComponent("loader_component",  { scene: startupScene }, "scene_loader", {
          success: function() {
            applicationAsset.load({
              load: function() {
                console.log('application loaded!');
                if (isFunction(fn)) {
                  fn(applicationAsset);
                }
              }
            });
          }
        });
      }
      else {
        applicationAsset.load({
          load: function() {
            console.log('application loaded!');
            if (isFunction(fn)) {
              fn(applicationAsset);
            }
          }
        });
      }
    });
  }

  function loadApp061(selector, config, opts, fn) {
    loadAppJson(config, opts, function(baseUrl, projectData) {
      var entities = new VAPI.EntityCollection(projectData.entities);
      var applicationEntity = entities.get(projectData.project.startupApplicationId);
      var selector = applicationEntity && applicationEntity.get('payload.container') || '#verold3d';
      var engineName = applicationEntity && applicationEntity.get('payload.engineName') || 'Default';
      var useLoader = applicationEntity && applicationEntity.get('payload.useVeroldLoader') || true;
      var startupScene = applicationEntity && applicationEntity.get('payload.loadStartupScene');
      var applicationAsset;

      var veroldEngine = new VAPI.Engine({
        'engineName': engineName,
        'container': document.querySelector(selector)
      });

      veroldEngine.initialize({
        entities: entities,
        componentSettings: { runtime: true }
      });

      applicationAsset = veroldEngine.assetRegistry.assets[applicationEntity.id];

      if ( useLoader ) {
        applicationAsset.addComponent("loader_component",  { scene: startupScene }, "scene_loader", {
          success: function() {
            applicationAsset.load({
              load: function() {
                console.log('application loaded!');
                if (isFunction(fn)) {
                  fn(applicationAsset);
                }
              }
            });
          }
        });
      }
      else {
        applicationAsset.load({
          load: function() {
            console.log('application loaded!');
            if (isFunction(fn)) {
              fn(applicationAsset);
            }
          }
        });
      }
    });
  }

  function loadApp062(selector, config, opts, fn) {
    loadAppJson(config, opts, function(baseUrl, projectData) {
      var entities = new VAPI.EntityCollection(projectData.entities);
      var applicationEntity = entities.get(projectData.project.startupApplicationId);
      var container = opts.container || applicationEntity && applicationEntity.get('payload.container') || '#verold3d';
      var engineName = opts.engineName || applicationEntity && applicationEntity.get('payload.engineName') || 'Default';
      var useLoader = applicationEntity && applicationEntity.get('payload.useVeroldLoader') || true;
      var startupScene = applicationEntity && applicationEntity.get('payload.loadStartupScene');
      var applicationAsset;

      var veroldEngine = new VAPI.Engine({
        'engineName': engineName,
        'container':  container
      });

      veroldEngine.initialize({
        entities: entities,
        componentSettings: { runtime: true }
      }, function() {

        applicationAsset = veroldEngine.assetRegistry.assets[applicationEntity.id];

        if ( useLoader ) {
          applicationAsset.addComponent("loader_component",  { scene: startupScene }, "scene_loader", {
            success: function() {
              applicationAsset.load({
                load: function() {
                  console.log('application loaded!');
                  if (isFunction(fn)) {
                    fn(applicationAsset);
                  }
                }
              });
            }
          });
        }
        else {
          applicationAsset.load({
            load: function() {
              console.log('application loaded!');
              if (isFunction(fn)) {
                fn(applicationAsset);
              }
            }
          });
        }
      });
    });
  }

  function loadApp05x(selector, config, opts, fn) {
    loadAppHtmlCssJson(selector, config, opts, function(baseUrl, projectData) {
      window.$ = window.$ || window.jQuery;
      VAPI.addProjectData(projectData);
      loadJS(relative(config.resources.js, baseUrl), function() {
        console.log('loaded!');
      });
    });
  }

  Verold.load = function(selector, configUrl, opts, fn) {
    var parts;
    opts = opts || {};
    if (typeof configUrl === 'string') {
      parts = configUrl.split('/');
      parts.pop();

      loadJSON(configUrl, function(err, configObj) {
        opts.baseUrl = configObj && configObj.resources && configObj.resources.baseUrl || parts.join('/');
        loadApp(selector, configObj, opts, fn);
      });
    } else {
      loadApp(selector, configUrl, opts, fn);
    }
  };


  //check to see if webgl context is available
  Verold.supportsWebGL = function(){
    var canvas = document.createElement('canvas');
    return !!window.WebGLRenderingContext && !!(canvas.getContext("webgl") || canvas.getContext( 'experimental-webgl' ));
  };


  //check to see if this is a mobile browser
  Verold.isMobile = function(){
    return /iphone|ipad|ipod|android|blackberry|bb10|mini|windows\sce|palm/i.test(navigator.userAgent.toLowerCase());
  };

  //return an object with a list of browsers
  Verold.getBrowsers = function(){
    var ua = navigator.userAgent;

    var browser = {
      chrome: ua.indexOf('Chrome') > -1,
      ie: ua.indexOf('MSIE') > -1 || ua.indexOf('Microsoft') > -1,
      firefox: ua.indexOf('Firefox') > -1,
      opera: ua.indexOf('Presto') > -1,
      netscape: ua.indexOf('Netscape') > -1
    };

    browser.firefox_mac = (ua.indexOf('Mac') > -1) && browser.firefox;
    browser.safari = (ua.indexOf('Safari') > -1) && !browser.chrome;

    return browser;
  };
})();
