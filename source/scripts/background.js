/**
 * @type {object} Default bag of options.
 */
var defaultOptions = {

  // Whether panels should be automatically collapsed when they lose focus.
  autoCollapse: false,

  // Whether windows should be kept open when moving tabs to panels
  keepWindowsOpen: true,

  // Whether panel controls should be shown in the context menu
  showContextMenuItems: true,

  // Whether Google Analytics is enabled
  enableAnalytics: false

};

/**
 * @type {object} Bag of options that is updated at runtime.
 */
var options = defaultOptions;

// Populate the options bag when the script is loaded. Reloaded event pages
// should load options as well.
loadOptions();

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

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(receiveFocusChange);

/**
 * Sets up the extension when it's started.
 */
function onStartup() {
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
    options = _.assign({}, defaultOptions, data.options);

    if (callback) {
      callback(options);
    }
  });
}

/**
 * Saves the bag of options into the user's synced local storage.
 *
 * @param  {object} changedOptions Bag of changed options.
 */
function saveOptions(changedOptions) {
  chrome.storage.sync.set({ options: _.assign(options, changedOptions) });
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
  if (changedData.options && areaName === 'sync') {
    loadOptions(updateContextMenu);
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
  chrome.storage.local.get([
    'setupComplete',
    'setupProgress',
    'resetChrome49'
  ], function(data) {
    // If setup is in progress, update the setup step to indicate that Chrome
    // has been restarted.
    if (data.setupProgress === 'panelsEnabled') {
      chrome.storage.local.set({ setupProgress: 'chromeRestarted' });
      showSetupDialog();
    }

    // Reset setup progress for Chrome 49 updaters.
    if (data.setupComplete && !data.resetChrome49 && isChrome49OrNewer()) {
      chrome.storage.local.set({
        setupComplete: false,
        setupProgress: 'analytics',
        resetChrome49: true
      });

      removeDefaultPopup();
    } else {
      // Check if setup has been completed
      if (data.setupComplete) {
        setupContextMenu();
      } else {
        removeDefaultPopup();
      }
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
  chrome.windows.onFocusChanged.addListener(function() {
    loadOptions(updateContextMenu);
  });

  updateContextMenu();
}

/**
 * Receives a message from another script.
 *
 * @param  {object}        message  Object with a mandatory type property.
 * @param  {MessageSender} sender   Information about the sender.
 * @param  {Function}      callback (Optional.) Parameters are specific to the
 *                                  type of the message object.
 * @return {boolean} Whether the callback will be called afterwards.
 * @see    https://developer.chrome.com/extensions/runtime#event-onMessage
 */
function receiveMessage(message, sender, callback) {
  switch (message.type) {
    case 'onFlagsOpened':
      showFlagsHelpNotification();
      return false;

    case 'onSetupComplete':
      showShareDialog();
      setupDefaultPopup();
      setupContextMenu();
      return false;

    case 'getOptions':
      // We're loading the options here since this event page might not be
      // loaded when we get the message.
      loadOptions(callback);
      return true;

    case 'setOptions':
      // Changed options are specified as message.options.
      saveOptions(message.options);
      return false;

    case 'activeTabIntoPanel':
      tabIntoPanel();
      return false;

    case 'activePanelIntoTab':
      panelIntoTab();
      return false;

    case 'panelIntoTab':
      // Panel's window ID is specified as message.windowId.
      panelIntoTab(message.windowId);
      return false;
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
 * @param  {object}          info Event information.
 * @param  {chrome.tabs.Tab} tab  Tab where the click occurred.
 * @see    https://developer.chrome.com/extensions/contextMenus#event-onClicked
 */
function receiveContextMenuClick(info, tab) {
  var id = info.menuItemId;

  switch (id) {
    case 'togglePanel':
      togglePanel(tab);
      break;

    case 'openInPanel':
      openInPanel(info.linkUrl);
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
  if (!options.showContextMenuItems) {
    chrome.contextMenus.removeAll();
    return;
  }

  chrome.contextMenus.create({
    id: 'togglePanel',
    title: chrome.i18n.getMessage('toggle_panel')
  });

  chrome.contextMenus.create({
    id: 'openInPanel',
    title: chrome.i18n.getMessage('open_in_panel'),
    contexts: ['link']
  });
}

/**
 * Receives changes to the focused window.
 *
 * @param  {number} windowId ID of the newly focused window.
 * @see    https://developer.chrome.com/extensions/windows#event-onFocusChanged
 */
function receiveFocusChange(windowId) {
  // Collapse panels automatically if enabled
  if (options.autoCollapse) {
    collapsePanels();
  }
}

/**
 * Collapses panels automatically based on the focused window.
 */
function collapsePanels() {
  chrome.windows.getAll({ populate: true }, function(windows) {
    _.filter(windows, shouldMinimize).forEach(function(vindov) {
      chrome.windows.update(vindov.id, { state: 'minimized' });
    });
  });
}

/**
 * If automatic collapsing is enabled, returns whether the given window should
 * be minimized.
 *
 * @param  {chrome.windows.Window} vindov
 * @return {boolean} True if the window should be minimized, false otherwise.
 */
function shouldMinimize(vindov) {
  // If it's not a panel, we're not interested.
  if (!isPanel(vindov)) {
    return false;
  }

  // If it's a panel, it should be minimised unless it's either focused or its
  // tab is pinned.
  return !(vindov.focused || vindov.tabs[0].pinned);
}

/**
 * Shows a help notification for enabling the panels flag.
 * TODO: Unintuitive, replace with an infobar when that feature becomes stable.
 */
function showFlagsHelpNotification() {
  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: '/images/icon/icon-48.png',
    title: chrome.i18n.getMessage('extension_name'),
    message: chrome.i18n.getMessage('flags_help_message'),
    buttons: [{ title: chrome.i18n.getMessage('flags_help_button') }],
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
  openDialog('/html/setup.html', 500, 690);
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
 * Opens a URL in a panel.
 *
 * @param {string}   url      URL to open
 * @param {function} callback (Optional.)
 */
function openInPanel(url, callback) {
  chrome.windows.create({ url: url, focused: true, type: 'panel' }, callback);
}

/**
 * Opens a tab as a panel window. The tab will get closed and reopened.
 *
 * @param  {chrome.tabs.Tab} tab      (Optional.) Tab to open as a panel.
 *                                    Defaults to the active tab.
 * @param  {boolean}         isUnsafe (Optional). Whether the panel should be
 *                                    created without any checks for user
 *                                    preferences. Defaults to false.
 */
function tabIntoPanel(tab, isUnsafe) {
  if (tab === undefined) {
    getActiveTab(tabIntoPanel);
    return;
  }

  // If the currently open window is the only one, let's add a new tab to it so
  // that it won't get closed when its only tab is panelised. Setting isUnsafe
  // to true avoids an infinite loop.
  if (!isUnsafe && options.keepWindowsOpen) {
    ensureWindowNotClosed(tab, _.partialRight(tabIntoPanel, true));
    return;
  }

  openInPanel(tab.url, function() {
    chrome.tabs.remove(tab.id);
  });
}

/**
 * Ensures that the window of the given tab will not be closed after the tab is
 * removed from the window. Prevents the window from closing by opening a new
 * tab.
 *
 * @param  {chrome.tabs.Tab}   tab      Tab whose window should not be closed.
 * @param  {function}          callback (Optional.) Parameters:
 *                                      {chrome.tabs.Tab} The given tab.
 */
function ensureWindowNotClosed(tab, callback) {
  var _callback = function() {
    if (callback) {
      callback(tab);
    }
  };

  chrome.windows.get(tab.windowId, { populate: true }, function(vindov) {
    if (vindov.tabs.length === 1) {
      chrome.tabs.create({ windowId: vindov.id, active: false }, _callback);
      return;
    }

    _callback();
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
 * Gets the window ID of the active panel or the most recent panel, if one
 * exists.
 *
 * TODO: Should be two separate functions.
 *
 * @param  {Function} callback Parameters: {number}
 */
function getActivePanel(callback) {
  chrome.windows.getAll(null, function(windows) {
    var panels = _(windows).filter(isPanel);
    var activePanel = panels.find({ focused: true });

    if (activePanel) {
      callback(activePanel.id);
      return;
    }

    // IDs increase as windows are created.
    var mostRecentPanel = panels.map('id').max();

    if (mostRecentPanel) {
      callback(mostRecentPanel);
    }

    // TODO: Callback should be called with null or something.
  });
}

/**
 * Opens a URL in the last focused "normal" window if one exists. Creates a new
 * window otherwise.
 *
 * @param {string} url URL to open
 */
function openInFocusedWindow(url) {
  chrome.windows.getLastFocused({ windowTypes: ['normal'] }, function(vindov) {
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

function isChrome49OrNewer() {
  var userAgent = navigator.userAgent;
  var majorVersion = /Chrome\/([0-9]+)/.exec(userAgent)[1];

  return parseInt(majorVersion) >= 49;
}
