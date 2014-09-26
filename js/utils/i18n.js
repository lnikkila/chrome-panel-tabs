/**
 * Traverses through all HTML elements and injects translated strings.
 * Thanks to https://code.google.com/p/chromium/issues/detail?id=115800#c11
 */
document.addEventListener('DOMContentLoaded', function() {
  var elements = document.querySelectorAll('*');
  var attribute = 'data-i18n';

  Array.prototype.forEach.call(elements, function(element) {
    if (element.hasAttribute(attribute)) {
      message = element.getAttribute(attribute);
      element.innerHTML = chrome.i18n.getMessage(message);
    }
  });
});
