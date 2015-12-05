var del = require('del');
var gulp = require('gulp');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var zip = require('gulp-zip');

var vendorScripts = [
  'bower_components/lodash/lodash.js'
];

var copyableFiles = [
  'source/**',
  '!source/scripts/**',
  '!source/stylesheets/**/*.scss'
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

gulp.task('build', ['_buildOthers', '_buildScripts', '_buildStylesheets']);

gulp.task('_buildOthers', ['clean'], function() {
  return gulp.src(copyableFiles).pipe(gulp.dest('build'));
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

gulp.task('_buildStylesheets', ['clean'], function() {
  return gulp.src('source/stylesheets/**/*.scss')
      .pipe(sass())
      .pipe(gulp.dest('build/stylesheets/'))
});

gulp.task('zip', ['build'], function() {
  return gulp.src('build/**')
      .pipe(zip('build.zip'))
      .pipe(gulp.dest('build'));
});

/**
 * default
 */

gulp.task('default', ['build', 'zip']);
