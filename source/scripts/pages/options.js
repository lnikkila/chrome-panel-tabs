/**
 * Initialises the options page.
 */
document.addEventListener('DOMContentLoaded', function() {
  chrome.runtime.sendMessage({ type: 'getOptions' }, readOptions);

  // Listen to value changes
  _.each(document.querySelectorAll('input[data-option]'), function(element) {
    element.addEventListener('change', _.partial(writeOption, element));
  });
});

/**
 * Loads the given options into the UI.
 *
 * @param  {object} options Object given by the background script.
 */
function readOptions(options) {
  _.forEach(options, readOption);
}

/**
 * Manipulates the UI so that it reflects the value of the given option key.
 * Options can depend on other options by fetching their values out of the bag.
 *
 * @param  {any}    value   Value for the option that should be loaded.
 * @param  {string} key     Key for the option that should be loaded.
 * @param  {object} options Bag containing all options.
 */
function readOption(value, key, options) {
  // Find the input element that corresponds to this option
  var input = document.querySelector('input[data-option="' + key + '"]');

  if (input) {
    setValue(input, value);
  }
}

/**
 * Manipulates the options so that they reflect the value of the input element
 * that has been changed by the user.
 *
 * @param  {HTMLInputElement} input The element whose value changed.
 * @param  {Event}            event The event for the change.
 */
function writeOption(input, event) {
  // The option key is stored as the data-option attribute
  var key = input.dataset.option;
  var value = getValue(input);

  ga('send', 'event', 'Options', value.toString(), key);

  var changedOptions = _.zipObject([key], [value]);

  chrome.runtime.sendMessage({ type: 'setOptions', options: changedOptions });
}

/**
 * Sets the option value to the given input element.
 *
 * @param {HTMLInputElement} element
 * @param {any} value
 */
function setValue(element, value) {
  var inputType = element.getAttribute('type');

  switch (inputType) {
    case 'checkbox':
      element.checked = value;
      break;

    default:
      element.value = value;
  }
}

/**
 * Gets the option value of the given input element.
 *
 * @param  {HTMLInputElement} element
 * @return {any}
 */
function getValue(element) {
  var inputType = element.getAttribute('type');

  switch (inputType) {
    case 'checkbox':
      return element.checked;

    default:
      return element.value;
  }
}
