var del = require('del');
var gulp = require('gulp');
var jasmine = require('gulp-jasmine-phantom');
var uglify = require('gulp-uglify');
var zip = require('gulp-zip');

var vendorScripts = [
  'bower_components/lodash/lodash.js'
];

/**
 * clean
 */

gulp.task('clean', function(callback) {
  del('build', callback);
});

/**
 * build
 */

gulp.task('build', ['_buildOthers', '_buildScripts']);

gulp.task('_buildOthers', ['clean'], function() {
  return gulp.src(['source/**', '!source/scripts/**'])
      .pipe(gulp.dest('build'));
});

gulp.task('_buildScripts', ['_buildLocalScripts', '_buildVendorScripts']);

gulp.task('_buildLocalScripts', ['clean'], function() {
  return gulp.src('source/scripts/**')
      .pipe(uglify())
      .pipe(gulp.dest('build/scripts'));
});

gulp.task('_buildVendorScripts', ['clean'], function() {
  return gulp.src(vendorScripts)
      .pipe(uglify())
      .pipe(gulp.dest('build/scripts/vendor'));
});

gulp.task('zip', ['build'], function() {
  return gulp.src('build/**')
      .pipe(zip('build.zip'))
      .pipe(gulp.dest('build'));
});

/**
 * test
 */

gulp.task('test', ['build'], function() {
  return gulp.src('spec/**/*_test.js').pipe(jasmine({
    abortOnFail: true,
    includeStackTrace: true,
    integration: true
  }));
});

/**
 * default
 */

gulp.task('default', ['build', 'test', 'zip']);
