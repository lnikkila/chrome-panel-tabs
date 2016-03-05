/**
 * Initialises the setup page.
 */
document.addEventListener('DOMContentLoaded', function() {
  var headerNormal = document.querySelector('.header--normal');
  var headerResetChrome49 = document.querySelector('.header--reset');

  var stepAnalytics = document.querySelector('.analytics');
  var stepEnablePanels = document.querySelector('.enable-panels');
  var stepRestartChrome = document.querySelector('.restart-chrome');
  var stepTestPanels = document.querySelector('.test-panels');

  var buttonEnableAnalytics = stepAnalytics.querySelector('.enable');
  var buttonDisableAnalytics = stepAnalytics.querySelector('.disable');
  var buttonEnablePanels = stepEnablePanels.querySelector('.button');
  var buttonTestPanels = stepTestPanels.querySelector('.button');

  // Click listeners
  buttonEnableAnalytics.addEventListener('click', enableAnalytics);
  buttonDisableAnalytics.addEventListener('click', disableAnalytics);
  buttonEnablePanels.addEventListener('click', enablePanels);
  buttonTestPanels.addEventListener('click', testPanels);

  var linkSkipSetup = document.querySelector('.skip-setup');

  linkSkipSetup.addEventListener('click', skipSetup);

  // Checks the setup progress and toggles the active section
  chrome.storage.local.get(['setupProgress', 'resetChrome49'], function(data) {
    var flag = data.setupProgress;
    var step;

    switch (flag) {
      case 'analytics':
        step = stepEnablePanels;
        break;

      case 'chromeRestarted':
        step = stepTestPanels;
        break;

      case 'panelsEnabled':
        step = stepRestartChrome;
        break;

      default:
        step = stepAnalytics;
        break;
    }

    step.classList.add('active');

    if (data.resetChrome49) {
      headerNormal.style.display = 'none';
      headerResetChrome49.style.display = 'block';
    } else {
      headerNormal.style.display = 'block';
      headerResetChrome49.style.display = 'none';
    }
  });
});

/**
 * Sets the analytics opt-in flag.
 */
function setAnalytics(isEnabled) {
  var changedOptions = { enableAnalytics: isEnabled };

  chrome.storage.local.set({ setupProgress: 'analytics' });
  chrome.runtime.sendMessage({ type: 'setOptions', options: changedOptions });

  location.reload();
}

function enableAnalytics() {
  setAnalytics(true);
}

function disableAnalytics() {
  setAnalytics(false);
}

/**
 * Prompts the user to enable the panels flag on chrome://flags.
 */
function enablePanels() {
  ga('send', 'event', 'Setup', 'Enable panels');

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
  ga('send', 'event', 'Setup', 'Test panels');

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
        ga('send', 'event', 'Setup', 'Test passed');
        finishSetup();
        break;

      default:
        ga('send', 'event', 'Setup', 'Test failed');
        alert(chrome.i18n.getMessage('panels_not_enabled_error'));
        location.reload();
    }
  });
}

/**
 * Confirms skipping setup.
 */
function skipSetup() {
  ga('send', 'event', 'Setup', 'Skip confirmation');

  var isSure = confirm(chrome.i18n.getMessage('skip_setup_warning'));

  if (isSure) {
    ga('send', 'event', 'Setup', 'Skip');
    finishSetup();
  } else {
    ga('send', 'event', 'Setup', 'Cancel skip');
  }
}

/**
 * Finishes the setup by setting the flag and sending a message to the
 * background script.
 */
function finishSetup() {
  chrome.storage.local.set({
    setupComplete: true,
    resetChrome49: true
  }, function() {
    chrome.runtime.sendMessage({ type: 'onSetupComplete' });
    window.close();
  });
}
