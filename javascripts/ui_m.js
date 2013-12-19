/*global $:true */
var AppUI = (function() {

  var tabContainer,
      tabContainerScroll;

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
    },

    hideMenus : function() {
      $('.menu').hide();
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

    showUI : function() {
      this.hideHeaders();
      this.showMenus();
      this.initInstructions();
    },

    initInstructions : function() {
      var ins = $('#instructions');
      ins.find('.close').click(function(e){
        $('#helpLink').click();
      });
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

    initControlsOverlay : function(exEventHandlers) { },

    initInfoOverlay : function() {
      this.initMenuLink('#infoLink','#info-panel','icon-project');
      this.initMenuLink('#helpLink','#instructions','icon-help-alt');
      $('#helpLink').click();
    },

    initMenuLink : function(linkSelector,panelSelector,className) {
      var that = this,
          panel = $(panelSelector),
          link = $(linkSelector);

      link.click(function(e){
        that.hidePanels(linkSelector,panelSelector);
        var target = $(e.target);
        if(target.is('i')) { target = target.parent('a'); }
        if(panel.is(':visible')) {
          target.find('i').removeClass('icon-close').addClass(className);
          panel.hide();
        } else {
          target.find('i').removeClass(className).addClass('icon-close');
          panel.show();
        }
      });
    },

    hidePanels : function(linkSelector,panelSelector) {
      var panelsToHide = $('.panel').not(panelSelector),
      linksToReset = $('#mainMenu a').not(linkSelector);

      panelsToHide.hide();
      linksToReset.each(function(index,link) {
        var i = $(link).find('i');
        i.removeClass('icon-close').addClass(i.attr('data-defaultClass'));
      });
    }

  };

})();
