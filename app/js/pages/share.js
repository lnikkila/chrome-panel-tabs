/**
 * Initialises the share page.
 */
document.addEventListener('DOMContentLoaded', function() {
  var buttonCloseWindow = document.querySelector('.close-window');
  var inputLink = document.querySelector('input');

  buttonCloseWindow.addEventListener('click', function() {
    window.close();
  });

  inputLink.addEventListener('click', function() {
    inputLink.select();
  });
});
