var del = require('del');
var gulp = require('gulp');
var jasmine = require('gulp-jasmine-phantom');
var zip = require('gulp-zip');

gulp.task('clean', function(callback) {
  del('build', callback);
});

gulp.task('build', ['clean'], function() {
  return gulp.src('source/**').pipe(gulp.dest('build'));
});

gulp.task('zip', ['build'], function() {
  return gulp.src('build/**')
      .pipe(zip('build.zip'))
      .pipe(gulp.dest('build'));
});

gulp.task('test', ['build'], function() {
  return gulp.src('spec/**/*_test.js').pipe(jasmine({
    abortOnFail: true,
    includeStackTrace: true,
    integration: true
  }));
});

gulp.task('default', ['build', 'test', 'zip']);
