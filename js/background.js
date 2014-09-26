/*
 * Initialise the extension.
 */

// The onClicked listener will only be called if a default popup has not been
// set. We remove the popup if we detect that setup has not been completed.
chrome.browserAction.onClicked.addListener(showSetupDialog);

// Check for setup completion status
chrome.runtime.onInstalled.addListener(checkForSetupCompletion);
chrome.runtime.onStartup.addListener(checkForSetupCompletion);

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener(receiveMessage);

/**
 * If the setup has not been completed, remove the popup from the browser
 * action button to let the click event reach the onClicked listener so we can
 * start the setup.
 *
 * This should be called each time the extension starts.
 */
function checkForSetupCompletion() {
  // Check if a legacy setup flag exists and replace it with the new one.
  // TODO: Remove this check in a future version.
  chrome.storage.local.get('panelsEnabled', function(data) {
    if (data.panelsEnabled) {
      chrome.storage.local.set({ 'setupComplete': true });
      chrome.storage.local.remove('panelsEnabled');
    }

    // Check if setup has been completed
    chrome.storage.local.get('setupComplete', function(data) {
      if ( ! data.setupComplete) {
        removeDefaultPopup();
      }
    });
  });

  // If setup is in progress, update the setup step to indicate that Chrome
  // has been restarted.
  chrome.storage.local.get('setupProgress', function(data) {
    if (data.setupProgress == 1) {
      chrome.storage.local.set({ 'setupProgress': 2 });
      showSetupDialog();
    }
  });
}

/**
 * Removes the browser action popup so that the onClicked listener can fire.
 */
function removeDefaultPopup() {
  chrome.browserAction.setPopup({ popup: '' });
}

/**
 * Restores the browser action popup specified in the manifest.
 */
function restoreDefaultPopup() {
  var manifest = chrome.runtime.getManifest();
  var defaultPopup = manifest.browser_action.default_popup;
  chrome.browserAction.setPopup({ popup: defaultPopup });
}

/**
 * Receives a message from another script.
 *
 * @param  {any} message
 * @param  {chrome.runtime.MessageSender} sender
 * @param  {function} sendResponse
 * @see    https://developer.chrome.com/extensions/runtime#event-onMessage
 */
function receiveMessage(message, sender, sendResponse) {
  switch (message) {
    // The flags page was opened during setup
    case 'onFlagsOpened':
      showHelpNotification();
      break;

    // Setup is complete, huzzah!
    case 'onSetupComplete':
      showShareDialog();
      restoreDefaultPopup();
      break;
  }
}

/**
 * Shows a help notification for enabling the panels flag.
 * TODO: Unintuitive, replace with an info bar when they become stable.
 */
function showHelpNotification() {
  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: '/images/icon/icon-48.png',
    title: chrome.i18n.getMessage('extension_name'),
    message: chrome.i18n.getMessage('help_notification_message'),
    buttons: [{ title: chrome.i18n.getMessage('help_notification_button') }],
    isClickable: true,
    priority: 2
  }, function(notificationId) {
    var onClickCallback = function(clickedId) {
      if (clickedId == notificationId) {
        showSetupDialog();
      }
    };

    chrome.notifications.onButtonClicked.addListener(onClickCallback);
    chrome.notifications.onClicked.addListener(onClickCallback);
  });
}

/**
 * Opens the setup dialog.
 */
function showSetupDialog() {
  openDialog('/html/setup.html');
}

/**
 * Opens the share dialog.
 */
function showShareDialog() {
  openDialog('/html/share.html');
}

/**
 * Opens a popup dialog centred to the screen.
 *
 * @param  {string} url Page to open in the popup.
 */
function openDialog(url) {
  chrome.windows.create({
    url: url,
    type: 'popup'
  }, centerWindow);
}

/**
 * Moves a window to the centre of the screen.
 *
 * @param  {chrome.windows.Window} vindov
 */
function centerWindow(vindov) {
  var leftPos = vindov.width / 2 - width / 2;
  var topPos = vindov.height / 2 - height / 2;

  chrome.windows.update(vindov.id, { left: leftPos, right: rightPos });
}
