var path         = require('path');
var childProcess = require('child_process');
var gulp         = require('gulp');
var babel        = require('gulp-babel');
var eslint       = require('gulp-eslint');
var flatten      = require('gulp-flatten');
var mocha        = require('gulp-mocha');
var msbuild      = require('gulp-msbuild');
var del          = require('del');
var through      = require('through2');
var Promise      = require('promise');

var exec = Promise.denodeify(childProcess.exec);

// Windows bin
gulp.task('clean-win-bin', function (cb) {
    del('bin/win', cb);
});

gulp.task('build-win-executables', ['clean-win-bin'], function () {
    return gulp
        .src('src/**/*.csproj')
        .pipe(msbuild({
            targets: ['Clean', 'Build']
        }));
});

gulp.task('copy-win-executables', ['build-win-executables'], function () {
    return gulp
        .src('src/**/win/bin/Release/*.exe')
        .pipe(flatten())
        .pipe(gulp.dest('bin/win'));
});

// Mac bin
gulp.task('clean-mac-bin', function (callback) {
    del('bin/mac', callback);
});

gulp.task('build-mac-executables', ['clean-mac-bin'], function () {
    function make (options) {
        return through.obj(function (file, enc, callback) {
            if (file.isNull()) {
                callback(null, file);
                return;
            }

            var dirPath = path.dirname(file.path);

            exec('make -C ' + dirPath, { env: options })
                .then(function () {
                    callback(null, file);
                })
                .catch(callback);
        });
    }

    return gulp
        .src('src/**/mac/Makefile')
        .pipe(make({
            DEST: path.join(__dirname, 'bin/mac')
        }));
});

gulp.task('copy-mac-scripts', ['clean-mac-bin'], function () {
    return gulp
        .src('src/**/mac/*.scpt')
        .pipe(flatten())
        .pipe(gulp.dest('bin/mac'));
});

// Test
gulp.task('run-playground-win', ['build-win'], function () {
    require('./test/playground/index');
});

gulp.task('run-playground-mac', ['build-mac'], function () {
    require('./test/playground/index');
});

gulp.task('test-lib', ['build-lib'], function () {
    return gulp
        .src('test/tests/*-test.js')
        .pipe(mocha({
            ui:       'bdd',
            reporter: 'spec',
            timeout:  typeof v8debug === 'undefined' ? 2000 : Infinity // NOTE: disable timeouts in debug
        }));
});

gulp.task('test', ['lint', 'test-lib']);

// General tasks
gulp.task('lint', function () {
    return gulp
        .src([
            'src/**/*.js',
            'test/**/*.js',
            '!test/playground/public/**/*',
            'Gulpfile.js'
        ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('clean-lib', function (cb) {
    del('lib', cb);
});

gulp.task('build-lib', ['clean-lib'], function () {
    return gulp
        .src('src/**/*.js')
        .pipe(babel())
        .pipe(gulp.dest('lib'));
});

gulp.task('build-win', ['build-lib', 'copy-win-executables']);
gulp.task('build-mac', ['build-lib', 'build-mac-executables', 'copy-mac-scripts']);
