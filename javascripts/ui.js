/*global $:true */
var AppUI = (function() {

  var tabContainer,
      tabContainerScroll,
      shareToolInitialized = false;

  return {

    setLoadingProgress : function(percent) {
      if(!this.loadingProgress) {
        this.createLoadingProgress();
      }
      this.loadingProgress.setProgress(percent); 
    },

    animateLoadingProgress : function(duration, callback) {
      if(!this.loadingProgress) {
        this.createLoadingProgress();
      }
      this.loadingProgress.animate(duration, callback);
    },

    hideHeaders : function() {
      $('#headers').hide();
    },

    showMenus : function() {
      $('.menu').show();
      if(!shareToolInitialized) {
        this.initShareTools();
      }
    },

    hideMenus : function() {
      $('.menu').hide();
    },

    initShareTools : function() {
      shareToolInitialized = true;
      // gplus share functionality can
      // only be envoked when share
      // button parent div is visible
      (function() {
        var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
        po.src = 'https://apis.google.com/js/plusone.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
      })();

      // facebook
      (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "//connect.facebook.net/en_US/all.js#xfbml=1";
      fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    },

    webGLDisabled : function() {
      console.info('webGLDisabled');
      this.hideLoadingProgress(); 
      $('#webGLunsupported').show();
    },

    floatingPointTexturesUnavailable : function() {
      //console.info('floatingPointTexturesUnavailable');
      this.hideLoadingProgress(); 
      $('#fpTexturesUnsupported').show();
    },

    vertexTexturesUnavailable : function() {
      //console.info('vertexTexturesUnavailable');
      this.hideLoadingProgress(); 
      $('#vTexturesUnsupported').show();
    },

    showControls : function() {
      $('#controlsLink').click();
    },

    showUI : function() {
      this.hideHeaders();
      this.showMenus();
      this.showControls();
    },

    hideLoadingProgress : function() {
      if(!this.loadingProgress) {
        this.createLoadingProgress();
      }
      this.loadingProgress.hide();
    },

    createLoadingProgress: function() {
      var LoadingProgress = function() {
        this.progressContainer = $('#loading-progress-container');
        this.progressIndicator = this.progressContainer.find('.loading-progress div');
      };

      LoadingProgress.prototype.setProgress = function(percent) {
        this.progressIndicator.css({width:percent+'%'});
      };

      LoadingProgress.prototype.animate = function(duration,callback) {
        this.progressIndicator.animate({width:'100%'},duration,callback);
      };

      LoadingProgress.prototype.hide = function() {
        this.progressContainer.hide();
      };

      this.loadingProgress = new LoadingProgress();
    },

    initControlsOverlay : function(exEventHandlers) {
      var controlsLink = '#controlsLink';
      this.initOverlayUI(controlsLink, '#controls-panel', this.toggleNiceScrollEvents(), exEventHandlers);
    },

    initInfoOverlay : function(exEventHandlers) {
      this.initOverlayUI('#infoLink', '#info-panel', this.toggleNiceScrollEvents(), exEventHandlers);

      // initialize tabs
      $('#info-panel').easytabs({
        animate:false,
        updateHash: false
      });

    },

    initOverlayUI : function(linkSelector, overlaySelector, intEventHandlers, exEventHandlers) {
      var link = $(linkSelector),
          overlay = $(overlaySelector),
          close = overlay.find('.close'),
          parentMenu = link.parent('.menu'),

          toggle = function() {

            if(overlay.is(':visible')) {
              overlay.hide(200);
              !!exEventHandlers && !!exEventHandlers.hide && exEventHandlers.hide();
            } else {
              !!exEventHandlers && !!exEventHandlers.show && exEventHandlers.show();
                link.addClass('active');
              overlay.show(200,function() {
                !!intEventHandlers && !!intEventHandlers.show && intEventHandlers.show();
              });
            }
          },

          closeClickHandler = function(e) {
            $('#mainMenu a').removeClass('active');
            !!intEventHandlers && !!intEventHandlers.hide && intEventHandlers.hide();
            toggle();
          },

          linkClickHandler = function(e) {
            $('.overlay').not(overlaySelector).hide();
            $('#mainMenu a').removeClass('active');
            !!intEventHandlers && !!intEventHandlers.hide && intEventHandlers.hide();
            toggle();
          };

      close.on('click',closeClickHandler);
      link.on('click',linkClickHandler);
      
      $(document).ready(function() {
        tabContainer = $('#tab-content-container');
        tabContainerScroll = tabContainer.niceScroll({
          autohidemode: false,
          cursorborder: 'none'
        });

        tabContainer.scroll(function(e) {
          tabContainerScroll.resize();
        });
      });

    },

    toggleNiceScrollEvents : function() {
      return {
          show: function() {
            if(!!tabContainerScroll && tabContainer.is(':visible')) {
              tabContainerScroll.show();
              tabContainerScroll.resize();
            }
          },
          hide: function() {
            if(!!tabContainerScroll) {
              tabContainerScroll.hide();
            }
          }
        };
    }
  };

})();
