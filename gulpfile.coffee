gulp = require 'gulp'
del = require 'del'

gulp.task 'clean', (callback) ->
  del 'build', callback

gulp.task 'build', ['clean'], ->
  gulp.src('source/**').pipe gulp.dest('build')

gulp.task 'default', ['build']
