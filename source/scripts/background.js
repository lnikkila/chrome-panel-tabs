/**
 * @type {object} Default bag of options.
 */
var defaultOptions = {};

/**
 * @type {object} Bag of options that is updated at runtime.
 */
var options = defaultOptions;

// The onClicked listener will only be called if a default popup has not been
// set. We remove the popup if we detect that setup has not been completed.
chrome.browserAction.onClicked.addListener(showSetupDialog);

// Listen for startup events
chrome.runtime.onInstalled.addListener(onStartup);
chrome.runtime.onStartup.addListener(onStartup);

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener(receiveMessage);

// Listen for local storage changes
chrome.storage.onChanged.addListener(receiveLocalStorageChange);

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener(receiveShortcut);

// Listen for context menu item clicks
chrome.contextMenus.onClicked.addListener(receiveContextMenuClick);

/**
 * Sets up the extension when it's started.
 */
function onStartup() {
  loadOptions();
  checkForSetupCompletion();
}

/**
 * Loads the bag of options from the user's synced local storage.
 *
 * This should be called each time the extension starts.
 *
 * @param  {Function} callback (Optional.) Parameters: {object} options
 */
function loadOptions(callback) {
  chrome.storage.sync.get('options', function(data) {
    // Override defaults with the user's options if they exist.
    if (data.options) {
      Object.keys(data.options).forEach(function(key) {
        options[key] = data.options[key];
      });
    }

    if (callback) {
      callback(options);
    }
  });
}

/**
 * Receives changes to the local storage.
 *
 * @param  {object} changedData  Map of changed keys and their corresponding
 *                               chrome.storage.StorageChange objects.
 * @param  {string} areaName     Name of the storage area the changes are for.
 *                               One of 'sync', 'local' or 'managed'.
 * @see https://developer.chrome.com/extensions/storage#event-onChanged
 */
function receiveLocalStorageChange(changedData, areaName) {
  // Reload options bag if it's changed.
  if (changedData.options) {
    loadOptions();
  }
}

/**
 * If the setup has not been completed, remove the popup from the browser
 * action button to let the click event reach the onClicked listener so we can
 * start the setup.
 *
 * This should be called each time the extension starts.
 */
function checkForSetupCompletion() {
  // Check if setup has been completed
  chrome.storage.local.get('setupComplete', function(data) {
    if (data.setupComplete) {
      setupContextMenu();
    } else {
      removeDefaultPopup();
    }
  });

  // If setup is in progress, update the setup step to indicate that Chrome
  // has been restarted.
  chrome.storage.local.get('setupProgress', function(data) {
    if (data.setupProgress === 'panelsEnabled') {
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
function setupDefaultPopup() {
  var manifest = chrome.runtime.getManifest();
  var defaultPopup = manifest.browser_action.default_popup;
  chrome.browserAction.setPopup({ popup: defaultPopup });
}

/**
 * Sets up the context menu.
 */
function setupContextMenu() {
  chrome.windows.onFocusChanged.addListener(updateContextMenu);
  updateContextMenu();
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
      setupDefaultPopup();
      setupContextMenu();
      break;

    case 'activeTabIntoPanel':
      tabIntoPanel();
      break;

    case 'activePanelIntoTab':
      panelIntoTab();
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
      tabIntoPanel();
      break;

    case 'activePanelIntoTab':
      panelIntoTab();
      break;
  }
}

/**
 * Receives context menu item clicks.
 *
 * @param  {object} info         Event information.
 * @param  {chrome.tabs.Tab} tab Tab where the click occurred.
 * @see    https://developer.chrome.com/extensions/contextMenus#event-onClicked
 */
function receiveContextMenuClick(info, tab) {
  var id = info.menuItemId;

  switch (id) {
    case 'togglePanel':
      togglePanel(tab);
      break;
  }
}

/**
 * Updates the context menu with the appropriate items for the current window.
 *
 * FIXME: If the context menu is opened in an unfocused window, it will reflect
 *        the state of the focused one. Currently this can't be fixed without
 *        resorting to a global content script. Until that is feasible or a
 *        better solution arises, the items added here should be as generic as
 *        possible.
 */
function updateContextMenu() {
  chrome.contextMenus.create({
    id: 'togglePanel',
    title: chrome.i18n.getMessage('toggle_panel')
  });
}

/**
 * Shows a help notification for enabling the panels flag.
 * TODO: Unintuitive, replace with an infobar when that feature becomes stable.
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
      if (clickedId === notificationId) {
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
  var leftPos = (screen.width - width) / 2;
  var topPos = (screen.height - height) / 2;

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
 * Turns a tab into a panel and vice versa.
 *
 * @param  {chrome.tabs.Tab} tab
 */
function togglePanel(tab) {
  chrome.windows.get(tab.windowId, function(vindov) {
    if (isPanel(vindov)) {
      panelIntoTab(vindov.id);
    } else {
      tabIntoPanel(tab);
    }
  });
}

/**
 * Opens a tab as a panel window. The tab will get closed and reopened.
 *
 * @param  {chrome.tabs.Tab} tab (Optional.) Tab to open as a panel window.
 *                               Defaults to the active tab.
 */
function tabIntoPanel(tab) {
  if (tab === undefined) {
    getActiveTab(tabIntoPanel);
    return;
  }

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
 * @param  {number} windowId (Optional.) Window ID of the panel. Defaults to the
 *                           currently active panel.
 */
function panelIntoTab(windowId) {
  if (windowId === undefined) {
    getActivePanel(panelIntoTab);
    return;
  }

  chrome.windows.get(windowId, { populate: true }, function(panel) {
    var tab = panel.tabs[0];

    chrome.windows.remove(windowId, function() {
      openInFocusedWindow(tab.url);
    });
  });
}

/**
 * Gets the active tab, if one exists.
 *
 * @param  {Function} callback Parameters: {chrome.tabs.Tab}
 */
function getActiveTab(callback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    callback(tabs[0]);
  });
}

/**
 * Gets the window ID of the active panel, if one exists.
 *
 * @param  {Function} callback Parameters: {number}
 */
function getActivePanel(callback) {
  chrome.windows.getAll(null, function(windows) {
    windows.forEach(function(vindov) {
      if (isPanel(vindov) && vindov.focused) {
        callback(vindov.id);
        return;
      }
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
