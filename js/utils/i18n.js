/**
 * A custom HTML element (created using web components) that acts as a
 * placeholder for a Chrome i18n string. Useful in HTML templates.
 *
 * The element gets replaced by the string when attached to the DOM. Note that
 * HTML contained in the string will *not* be escaped.
 *
 * Have I mentioned that I love web components?
 *
 * Usage: <chrome-i18n name="message_name">
 */
(function() {

  // Get a general HTML element prototype
  var prototype = Object.create(HTMLElement.prototype);

  // Callback that is invoked when the element is attached to the DOM.
  prototype.attachedCallback = function() {
    // Get the i18n message
    var messageName = this.getAttribute('name');
    var message = chrome.i18n.getMessage(messageName);

    // Replace the element with the string. HTML is not escaped!
    this.outerHTML = message;
  };

  // Register the custom element
  document.registerElement('chrome-i18n', { prototype: prototype });

})();
