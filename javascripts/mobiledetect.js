(function(w,d){

  // acquire script tag contents
  var scripts = d.getElementsByTagName('script'),
      thisScriptTag = scripts[scripts.length - 1],
      data = thisScriptTag.textContent || thisScriptTag.innerText,
      config,
      isMobile;

  // attempt to parse script tag content
  try {
     config = JSON.parse(data);
  } catch(e) {}

  // create global verold object if it does not exist already
  if(!w.verold) { w.verold = {}; }
  isMobile = (/iphone|ipad|ipod|android|blackberry|bb10|mini|ws\sce|palm/i.test(navigator.userAgent.toLowerCase()));
  w.verold.isMobile = isMobile;

  // redirect to mobile version if mobile device detected AND script content was parsed successfully
  if(isMobile && config && config.redirect) {
    w.location.href = config.redirect;
  }
})(window,document);
