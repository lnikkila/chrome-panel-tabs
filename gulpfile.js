var del = require('del');
var gulp = require('gulp');
var jasmine = require('gulp-jasmine-phantom');

gulp.task('clean', function(callback) {
  del('build', callback);
});

gulp.task('build', ['clean'], function() {
  gulp.src('source/**').pipe(gulp.dest('build'));
});

gulp.task('test', ['build'], function() {
  gulp.src('spec/**/*_test.js').pipe(jasmine({
    abortOnFail: true,
    includeStackTrace: true,
    integration: true
  }));
});

gulp.task('default', ['test']);
