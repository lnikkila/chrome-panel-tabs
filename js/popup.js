function enablePanels() {
  chrome.storage.local.set({ 'panelsEnabled': true });
  chrome.runtime.sendMessage({ type: 'showHelpAlert' });
  chrome.tabs.create({ url: 'chrome://flags/#enable-panels' });
}

function showTwitter() {
  chrome.tabs.create({ url: 'https://twitter.com/lnikkila' });
}

function showGitHub() {
  chrome.tabs.create({ url: 'https://github.com/lnikkila' });
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelector('button').addEventListener('click', enablePanels);
  document.querySelector('.feedback').addEventListener('click', showTwitter);
  document.querySelector('.github').addEventListener('click', showGitHub);
});
