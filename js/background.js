// Runs in the background when the extension is started. We'll check if the
// user has already been prompted to enable panels. If yes, we'll set the
// browser action to open the current tab in a panel. Otherwise we'll show a
// popup with the prompt page.

chrome.storage.local.get('panelsEnabled', function(data) {

  if (data.panelsEnabled) {
    chrome.browserAction.onClicked.addListener(function(tab) {
      chrome.windows.create({
        url: tab.url,
        type: 'panel'
      },
      function() {
        chrome.tabs.remove(tab.id);
      });
    });
  } else {
    chrome.browserAction.setPopup({ popup: '../html/popup.html' });
  }

});

// If we open an alert from a popup, it gets killed as soon as the popup
// closes. We'll have to listen to a message from the popup and open the alert
// from here.

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

  if (message.type == 'showHelpAlert') {
    alert('1. Click the “Enable” link under “Enable Panels”.\n' +
          '2. Click the “Relaunch Now” button at the bottom left corner.');
  }

});
