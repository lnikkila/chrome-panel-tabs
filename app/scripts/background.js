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

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(receiveShortcut);

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
    if (data.setupProgress == 'panelsEnabled') {
      chrome.storage.local.set({ setupProgress: 'chromeRestarted' });
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
 * @see    https://developer.chrome.com/extensions/runtime#event-onMessage
 */
function receiveMessage(message) {
  switch (message.type) {
    case 'onFlagsOpened':
      showHelpNotification();
      break;

    case 'onSetupComplete':
      showShareDialog();
      restoreDefaultPopup();
      break;

    case 'activeTabIntoPanel':
      activeTabIntoPanel();
      break;

    case 'activePanelIntoTab':
      activePanelIntoTab();
      break;

    case 'panelIntoTab':
      // Panel's window ID is specified as message.windowId.
      panelIntoTab(message.windowId);
      break;
  }
}

/**
 * Receives a keyboard shortcut from the user.
 *
 * @param  {string} command A command identifier specified in the manifest.
 */
function receiveShortcut(command) {
  switch (command) {
    case 'activeTabIntoPanel':
      activeTabIntoPanel();
      break;

    case 'activePanelIntoTab':
      activePanelIntoTab();
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
  openDialog('/html/setup.html', 500, 660);
}

/**
 * Opens the share dialog.
 */
function showShareDialog() {
  openDialog('/html/share.html', 500, 500);
}

/**
 * Opens a popup dialog centred to the screen.
 *
 * @param  {string} url    Page to open in the popup.
 * @param  {number} width
 * @param  {number} height
 */
function openDialog(url, width, height) {
  var leftPos = screen.width / 2 - width / 2;
  var topPos = screen.height / 2 - height / 2;

  chrome.windows.create({
    url: url,
    type: 'popup',
    left: leftPos,
    top: topPos,
    width: width,
    height: height
  });
}

/**
 * Queries the currently active tab and turns it into a panel.
 */
function activeTabIntoPanel() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    tabIntoPanel(tabs[0]);
  });
}

/**
 * Queries the currently active panel and turns it into a tab.
 */
function activePanelIntoTab() {
  chrome.windows.getAll(null, function(windows) {
    windows.forEach(function(vindov) {
      if (isPanel(vindov) && vindov.focused) {
        panelIntoTab(vindov.id);
        return;
      }
    });
  });
}

/**
 * Opens a tab as a panel window. The tab will get closed and reopened.
 *
 * @param  {chrome.tabs.Tab} tab Tab to open as a panel window.
 */
function tabIntoPanel(tab) {
  chrome.windows.create({
    url: tab.url,
    focused: true,
    type: 'panel'
  }, function() {
    chrome.tabs.remove(tab.id);
  });
}

/**
 * Opens a panel as a tab.
 *
 * @param  {number} windowId Window ID of the panel.
 */
function panelIntoTab(windowId) {
  chrome.windows.get(windowId, { populate: true }, function(panel) {
    var tab = panel.tabs[0];

    chrome.windows.remove(windowId, function() {
      openInFocusedWindow(tab.url);
    });
  });
}

/**
 * Opens a URL in the focused window if one exists. Creates a new window
 * otherwise.
 *
 * HACK: We're leveraging the bug/feature that getLastFocused() doesn't return
 * any windows of type 'panel' or 'detached_panel'. This might break in the
 * future.
 *
 * @param {string} url URL to open
 */
function openInFocusedWindow(url) {
  chrome.windows.getLastFocused(null, function(vindov) {
    if (vindov === undefined) {
      chrome.windows.create({ url: url, focused: false });
    } else {
      chrome.tabs.create({ windowId: vindov.id, url: url });
    }
  });
}

/**
 * Checks whether a window is a panel or not.
 *
 * @param  {chrome.windows.Window}  vindov Window to check.
 * @return {boolean} True if the window is a panel, false otherwise.
 */
function isPanel(vindov) {
  return vindov.type === 'panel' || vindov.type === 'detached_panel';
}
