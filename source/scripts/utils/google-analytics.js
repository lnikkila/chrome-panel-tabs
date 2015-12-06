window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;

chrome.runtime.sendMessage({ type: 'getOptions' }, function(options) {
  window['ga-disable-UA-59489103-2'] = !options.enableAnalytics;

  ga('create', 'UA-59489103-2', { cookieDomain: 'none' });
  ga('set', 'dimension1', chrome.runtime.id);
  ga('set', 'checkProtocolTask', null);
  ga('send', 'pageview', location.pathname);
});
