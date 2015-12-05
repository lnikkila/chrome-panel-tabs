/**
 * Initialises the setup page.
 */
document.addEventListener('DOMContentLoaded', function() {
  var stepEnablePanels = document.querySelector('.enable-panels');
  var stepRestartChrome = document.querySelector('.restart-chrome');
  var stepTestPanels = document.querySelector('.test-panels');

  var buttonEnablePanels = stepEnablePanels.querySelector('.button');
  var buttonTestPanels = stepTestPanels.querySelector('.button');

  // Click listeners
  buttonEnablePanels.addEventListener('click', enablePanels);
  buttonTestPanels.addEventListener('click', testPanels);

  var linkSkipSetup = document.querySelector('.skip-setup');
  linkSkipSetup.addEventListener('click', skipSetup);

  // Checks the setup progress and toggles the active section
  chrome.storage.local.get('setupProgress', function(data) {
    var flag = data.setupProgress;
    var step;

    switch (flag) {
      case 'chromeRestarted':
        step = stepTestPanels;
        break;

      case 'panelsEnabled':
        step = stepRestartChrome;
        break;

      default:
        step = stepEnablePanels;
        break;
    }

    step.classList.add('active');
  });
});

/**
 * Prompts the user to enable the panels flag on chrome://flags.
 */
function enablePanels() {
  chrome.storage.local.set({ setupProgress: 'panelsEnabled' });
  chrome.tabs.create({ url: 'chrome://flags/#enable-panels' });
  chrome.runtime.sendMessage({ type: 'onFlagsOpened' });

  window.close();
}

/**
 * Tests if panels really work by launching a new panel, checking its window
 * type and closing it.
 */
function testPanels() {
  chrome.storage.local.remove('setupProgress');

  chrome.windows.create({
    url: 'about:blank',
    type: 'panel',
    focused: false
  },
  function(newWindow) {
    chrome.windows.remove(newWindow.id);

    switch (newWindow.type) {
      case 'panel':
      case 'detached_panel':
        finishSetup();
        break;

      default:
        alert(chrome.i18n.getMessage('panels_not_enabled_error'));
        location.reload();
    }
  });
}

/**
 * Confirms skipping setup.
 */
function skipSetup() {
  var isSure = confirm(chrome.i18n.getMessage('skip_setup_warning'));

  if (isSure) {
    finishSetup();
  }
}

/**
 * Finishes the setup by setting the flag and sending a message to the
 * background script.
 */
function finishSetup() {
  chrome.storage.local.set({ 'setupComplete': true });
  chrome.runtime.sendMessage({ type: 'onSetupComplete' });
  window.close();
}
