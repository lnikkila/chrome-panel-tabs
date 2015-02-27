/**
 * Initialises the popup page.
 */
document.addEventListener('DOMContentLoaded', function() {
  var buttonOpenPanel = document.querySelector('.button');
  var linkSetShortcuts = document.querySelector('.shortcuts');

  buttonOpenPanel.addEventListener('click', onTabIntoPanelClick);
  linkSetShortcuts.addEventListener('click', showKeyboardShortcuts);

  getPanels(showPanelsList);
});

/**
 * Called when the big blue "put into a panel" button is clicked.
 */
function onTabIntoPanelClick(event) {
  // Tell the background script to do its thang
  chrome.runtime.sendMessage({ type: 'activeTabIntoPanel' });

  // Show a help notification if needed
  chrome.storage.local.get('putBackHelpShown', function(data) {
    if (!data.putBackHelpShown) {
      chrome.storage.local.set({ putBackHelpShown: true });
      showFlagsHelpNotification();
    }
  });
}

/**
 * Grabs an array of panel windows and builds a neat list out of them using
 * HTML templates.
 *
 * I love web components.
 *
 * @param  {array of chrome.windows.Window} panels Panels to list.
 */
function showPanelsList(panels) {
  if (panels.length === 0) {
    return;
  }

  var listOpenPanels = document.querySelector('.open-panels');
  var listItemTemplate = listOpenPanels.querySelector('template');

  // Remove the placeholder text
  document.querySelector('.placeholder').remove();

  panels.forEach(function(panel) {
    var listItem = document.importNode(listItemTemplate.content, true);
    var tab = panel.tabs[0];

    var favicon = listItem.querySelector('img');
    favicon.setAttribute('src', 'chrome://favicon/' + tab.url);
    favicon.setAttribute('alt', tab.title);

    var title = listItem.querySelector('span');
    title.textContent = tab.title;

    var link = listItem.querySelector('a');
    link.setAttribute('href', '#');

    link.addEventListener('click', function() {
      chrome.runtime.sendMessage({ type: 'panelIntoTab', windowId: panel.id });
    });

    listOpenPanels.appendChild(listItem);
  });
}

/**
 * Shows a help notification for putting panels back to tabs.
 * TODO: Remove this if it can be made less difficult.
 */
function showFlagsHelpNotification() {
  chrome.notifications.create('', {
    type: 'basic',
    iconUrl: '/images/icon/icon-48.png',
    title: chrome.i18n.getMessage('put_back_help_title'),
    message: chrome.i18n.getMessage('put_back_help_message'),
    buttons: [
      { title: chrome.i18n.getMessage('put_back_help_ok') },
      { title: chrome.i18n.getMessage('put_back_help_shortcuts') }
    ],
    isClickable: true,
    priority: 2
  }, function(notificationId) {
    chrome.notifications.onButtonClicked.addListener(function(id, button) {
      if (notificationId === id && button === 1) {
        showKeyboardShortcuts();
      }
    });
  });
}

/**
 * Shows the keyboard shortcuts page.
 */
function showKeyboardShortcuts() {
  chrome.tabs.create({
    url: 'chrome://extensions/configureCommands',
    active: true
  });
}

/**
 * Queries Chrome for all windows of type 'panel' or 'detached_panel'.
 *
 * @param  {function} callback Parameters: {array of chrome.windows.Window}
 */
function getPanels(callback) {
  chrome.windows.getAll({
    populate: true
  }, function(windows) {
    var panels = windows.filter(isPanel);
    callback(panels);
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
