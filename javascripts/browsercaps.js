var BrowserCaps = (function() {

  var webGLContext;
  try {
     webGLContext = (!!window.WebGLRenderingContext) ? document.createElement('canvas').getContext('experimental-webgl') : null;
  } catch(e) {}
  var webGLEnabled = !!webGLContext;
  var floatingPointTexturesEnabeled = (webGLEnabled) ? !!webGLContext.getExtension('OES_texture_float') : false;
  var vertexTexturesEnabeled = (webGLEnabled) ? !!(webGLContext.getParameter(webGLContext.MAX_VERTEX_TEXTURE_IMAGE_UNITS) != 0) : false;

  webGLContext = null;

  return {
    isWebGLEnabled : function() {
      return webGLEnabled;
    },

    isFloatingPointTexturesEnabeled : function() {
      return floatingPointTexturesEnabeled;
    },

    isVertexTexturesEnabeled : function() {
      return vertexTexturesEnabeled;
    }
  };

}());
