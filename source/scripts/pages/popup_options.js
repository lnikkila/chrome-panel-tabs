/**
 * Imports the options UI at the top of the body.
 */
var content = document.querySelector('link[href="options.html"]').import;
var anchor = document.body.firstChild;

_.forEach(content.body.children, function(child) {
  var clone = child.cloneNode(true);
  document.body.insertBefore(clone, anchor);
});
