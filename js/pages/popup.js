/**
 * Initialises the popup page.
 */
document.addEventListener('DOMContentLoaded', function() {
  var buttonOpenPanel = document.querySelector('.button');
  var linkSetShortcuts = document.querySelector('.shortcuts');

  buttonOpenPanel.addEventListener('click', function() {
    chrome.runtime.sendMessage({ type: 'activeTabIntoPanel' });
  });

  linkSetShortcuts.addEventListener('click', function() {
    chrome.tabs.create({
      url: 'chrome://extensions/configureCommands',
      active: true
    });
  });

  getPanels(showPanelsList);
});

/**
 * Grabs an array of panel windows and builds a neat list out of them using
 * HTML templates.
 *
 * I love web components.
 *
 * @param  {array of chrome.windows.Window} panels Panels to list.
 */
function showPanelsList(panels) {
  if (panels.length === 0) return;

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
      return vindov.type === 'panel' || vindov.type === 'detached_panel';
    });

    callback(panels);
  });
}
