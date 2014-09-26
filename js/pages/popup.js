/**
 * Initialises the popup page.
 */
document.addEventListener('DOMContentLoaded', function() {
  var buttonOpenPanel = document.querySelector('.button');
  var listOpenPanels = document.querySelector('.open-panels');

  buttonOpenPanel.addEventListener('click', function() {
    getActiveTab(tabIntoPanel);
  });

  getPanels(showPanelsList);
});

/**
 * Grabs an array of panel windows and builds a neat list out of them.
 * TODO: Use templates? Building views via JS is icky.
 *
 * @param  {array of chrome.windows.Window} panels Panels to list.
 */
function showPanelsList(panels) {
  if (panels.length > 0) {
    var listOpenPanels = document.querySelector('.open-panels');
    listOpenPanels.innerHTML = '';
  }

  panels.forEach(function(panel, i) {
    var tab = panel.tabs[0];

    var listItem = document.createElement('div');
    listItem.setAttribute('class', 'panel');

    var favicon = document.createElement('img');
    favicon.setAttribute('src', 'chrome://favicon/' + tab.url)
    favicon.setAttribute('alt', tab.title);

    var title = document.createElement('span');
    title.textContent = tab.title;

    var link = document.createElement('a');
    link.textContent = chrome.i18n.getMessage('put_back_panel');
    link.setAttribute('href', '#');

    link.addEventListener('click', function() {
      panelIntoTab(panel);
    });

    listItem.appendChild(favicon);
    listItem.appendChild(title);
    listItem.appendChild(link);

    listOpenPanels.appendChild(listItem);
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
    // Filter out all other window types
    var panels = windows.filter(function(vindov) {
      switch (vindov.type) {
        case 'panel':
        case 'detached_panel':
          return true;

        default:
          return false;
      }
    });

    callback(panels);
  });
}

/**
 * Queries the currently active tab.
 *
 * @param  {function} callback Parameters: {chrome.tabs.Tab}
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
 * @param  {chrome.windows.Window} panel Panel window to be opened as a tab.
 */
function panelIntoTab(panel) {
  var tab = panel.tabs[0];

  chrome.tabs.create({
    url: tab.url
  }, function() {
    chrome.windows.remove(panel.id);
  });
}
