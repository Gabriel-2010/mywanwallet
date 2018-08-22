const fs = require('fs');

const autoprefixer = require('gulp-autoprefixer');
const archiver     = require('archiver');
const bump         = require('gulp-bump');
const babelify     = require('babelify');
const browserify   = require('browserify');
const buffer       = require('vinyl-buffer');
const clean        = require('gulp-clean');
const concat       = require('gulp-concat');
const cssnano      = require('gulp-cssnano');
const fileinclude  = require('gulp-file-include');
const gulp         = require('gulp');
const less         = require('gulp-less');
const notify       = require('gulp-notify');
const plumber      = require('gulp-plumber' );
const rename       = require('gulp-rename');
const runSequence  = require('run-sequence');
const shell        = require('gulp-shell');
const source       = require('vinyl-source-stream');
const uglify       = require('gulp-uglify');
const zip          = require('gulp-zip');
const html2js      = require('html2js-browserify');

const app          = './app/';
const dist         = './dist/';


// Error / Success Handling
let onError = function(err) {
    notify.onError({
        title: "Error: " + err.plugin,
        subtitle: "<%= file.relative %>",
        message: "<%= error.message %>",
        sound: "Beep",
        icon: app + "images/icons/icon48.png",
    })(err);
    console.log(err.toString());
    this.emit('end');
};

function onSuccess(msg) {
    return {
        message: msg + " Complete! ",
        //sound:     "Pop",
        icon: app + "images/icons/icon48.png",
        onLast: true
    }
}

function notifyFunc(msg) {
    return gulp.src('.', { read: false })
        .pipe(notify(onSuccess(msg)))
}



// HTML / TPL Pages
let htmlFiles = app + 'layouts/*.html';
let tplFiles = app + 'includes/*.tpl';

gulp.task('html', function(done) {
    return gulp.src(htmlFiles)
        .pipe(plumber({ errorHandler: onError }))
        .pipe(fileinclude({ prefix: '@@', basepath: '@file' }))
        .pipe(gulp.dest(dist))
        .pipe(notify(onSuccess('HTML')))
});



// styles: Compile and Minify Less / CSS Files
let less_watchFolder = app + 'styles/**/*.less';
let less_srcFile = app + 'styles/etherwallet-master.less';
let less_destFolder = dist + 'css';
let less_destFile = 'etherwallet-master.css';
let less_destFileMin = 'etherwallet-master.min.css';

gulp.task('styles', function() {
    return gulp.src(less_srcFile)
        .pipe(plumber({ errorHandler: onError }))
        .pipe(less({ compress: false }))
        .pipe(autoprefixer({ browsers: ['last 4 versions', 'iOS > 7'], remove: false }))
        .pipe(rename(less_destFile))
        //.pipe( gulp.dest   (  less_destFolder                                         )) // unminified css
        .pipe(cssnano({ autoprefixer: false, safe: true }))
        .pipe(rename(less_destFileMin))
        .pipe(gulp.dest(less_destFolder))
        .pipe(notify(onSuccess('Styles')))
});


// js: Browserify
let js_watchFolder = app + 'scripts/**/*.{js,json,html}';
let js_srcFile = app + 'scripts/main.js';
let js_destFolder = dist + 'js/';
let js_destFile = 'etherwallet-master.js';
let browseOpts = { debug: true }; // generates inline source maps - only in js-debug
let babelOpts = {
    presets: ['es2015'],
    compact: false,
    global: true
};

function bundle_js(bundler) {
    return bundler.bundle()
        .pipe(plumber({ errorHandler: onError }))
        .pipe(source('main.js'))
        .pipe(buffer())
        .pipe(rename(js_destFile))
        .pipe(gulp.dest(js_destFolder))
        .pipe(notify(onSuccess('JS')))
}

function bundle_js_debug(bundler) {
    return bundler.bundle()
        .pipe(plumber({ errorHandler: onError }))
        .pipe(source('main.js'))
        .pipe(buffer())
        .pipe(rename(js_destFile))
        .pipe(gulp.dest(js_destFolder))
        .pipe(notify(onSuccess('JS')))
}


gulp.task('js', function() {
    let bundler = browserify(js_srcFile).transform(babelify).transform(html2js);
    bundle_js(bundler)
});

gulp.task('js-production', function(done) {
    let bundler = browserify(js_srcFile).transform(babelify, babelOpts).transform(html2js);
    bundle_js(bundler);
    done()
});

gulp.task('js-debug', function() {
    let bundler = browserify(js_srcFile, browseOpts).transform(babelify, babelOpts).transform(html2js);
    bundle_js_debug(bundler)
});



// Rebuild Static JS
let js_srcFilesStatic = app + 'scripts/staticJS/to-compile-to-static/*.js';
let js_destFolderStatic = app + 'scripts/staticJS/';
let js_destFileStatic = 'etherwallet-static.min.js';

gulp.task('staticJS', function() {
    return gulp.src(js_srcFilesStatic)
        .pipe(plumber({ errorHandler: onError }))
        .pipe(concat(js_destFileStatic))
        .pipe(uglify())
        .pipe(gulp.dest(js_destFolderStatic))
        .pipe(notify(onSuccess('StaticJS')))
});



// Copy
let imgSrcFolder = app + 'images/**/*';
let fontSrcFolder = app + 'fonts/*.*';
let cxSrcFiles = app + 'includes/browser_action/*.*';
let jsonFile = app + '*.json';
let trezorFile = app + 'scripts/staticJS/trezor-connect.js';
let jQueryFile = app + 'scripts/staticJS/jquery-1.12.3.min.js';
let bin = app + '/bin/*';
let staticJSSrcFile = js_destFolderStatic + js_destFileStatic;
let readMe = './README.md';


gulp.task('copy', gulp.series('staticJS', function(done) {
    gulp.src(imgSrcFolder)
        .pipe(gulp.dest(dist + 'images'))

    gulp.src(fontSrcFolder)
        .pipe(gulp.dest(dist + 'fonts'))

    gulp.src(staticJSSrcFile)
        .pipe(gulp.dest(dist + 'js'))

    gulp.src(jQueryFile)
        .pipe(gulp.dest(dist + 'js'))

    gulp.src(trezorFile)
        .pipe(gulp.dest(dist + 'js'))

    gulp.src(jsonFile)
        .pipe(gulp.dest(dist))

    gulp.src(readMe)
        .pipe(gulp.dest(dist));

    gulp.src(bin)
        .pipe(gulp.dest(dist + 'bin'))
        .pipe(notify(onSuccess(' Copy ')))
    done();
}));




// Clean files that get compiled but shouldn't
gulp.task('clean', function() {
    return gulp.src([
            dist + 'cx-wallet.html',
            dist + 'images/icons',
            dist + 'manifest.json',
        ], { read: false })
        .pipe(plumber({ errorHandler: onError }))
        .pipe(clean())
        .pipe(notify(onSuccess(' Clean ')))
});



// Bumps Version Number
function bumpFunc(t) {
  return gulp.src([app + '*.json'])
    .pipe( plumber   ({ errorHandler: onError   }))
    .pipe( bump      ({ type: t                 }))
    .pipe( gulp.dest  ( './app'                 ))
    .pipe( notify     ( onSuccess('Bump ' + t ) ))
}


// Get Version Number
let versionNum;
let versionMsg;
gulp.task('getVersion', function(done) {
    manifest = JSON.parse(fs.readFileSync(app + 'manifest.json'));
    versionNum = 'v' + manifest.version;
    versionMsg = 'Release: ' + versionNum
        //return gulp.src( './' )
        //.pipe( notify ( onSuccess('Version Number ' + versionNum ) ))
    done()
});


// zips dist folder
gulp.task('zip', gulp.series('getVersion', function() {
    return gulp.src(dist + '**/**/*')
        .pipe(plumber({ errorHandler: onError }))
        .pipe(rename(function (path) {
          path.dirname = './etherwallet-' + versionNum + '/' + path.dirname;
        }))
        .pipe(zip('./etherwallet-' + versionNum + '.zip'))
        .pipe(gulp.dest('./releases/'))
        .pipe(notify(onSuccess('Zip Dist ' + versionNum)));
}));


function archive() {
  let outputZip = fs.createWriteStream(__dirname + '/example.zip');
  let archiveZip = archiver('zip', {
      gzip: true,
  });
  outputZip.on('close', function() {
    console.log(archiveZip.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
  });
  archiveZip.on('error', function(err) {
    throw err;
  });
  archiveZip.pipe(outputZip);
  archiveZip.directory(dist, 'test2');
  archiveZip.finalize();


  let outputTar = fs.createWriteStream(__dirname + '/example.tgz');
  let archiveTar = archiver('tar', {
      gzip: true,
  });
  outputTar.on('close', function() {
    return gulp.src(archiveTar).pipe(onSuccess('Archive Complete: Tar, /dist' ));
  });
  archiveTar.on('error', function(err) {
    throw err;
  });
  archiveTar.pipe(outputTar);
  archiveTar.directory(dist, 'test2');
  archiveTar.finalize();

}


gulp.task('travisZip', gulp.series('getVersion', function() {
    return gulp.src(dist + '**/**/*')
        .pipe(plumber({ errorHandler: onError }))
        .pipe(rename(function (path) {
          path.dirname = './etherwallet-' + versionNum + '/' + path.dirname;
        }))
        .pipe(zip('./etherwallet-' + versionNum + '.zip'))
        .pipe(gulp.dest('./deploy/'))
        .pipe(notify(onSuccess('Zip Dist ' + versionNum)));
}));


// add all
gulp.task('add', function() {
    return gulp.src('*.js', { read: false })
        .pipe(shell([
            'git add -A'
        ]))
        //.pipe( notify ( onSuccess('Git Add' ) ))
});

// commit with current v# in manifest
gulp.task('commit', gulp.series('getVersion', function() {
    return gulp.src('*.js', { read: false })
        .pipe(shell([
            'git commit -m "Rebuilt and cleaned everything. Done for now."'
        ]))
        .pipe(notify(onSuccess('Commit')))
}));

// commit with current v# in manifest
gulp.task('commitV', gulp.series('getVersion', function() {
    return gulp.src('*.js', { read: false })
        .pipe(shell([
            'git commit -m " ' + versionMsg + ' "'
        ]))
        .pipe(notify(onSuccess('Commit w ' + versionMsg)))
}));

// tag with current v# in manifest
gulp.task('tag', gulp.series('getVersion', function() {
    return gulp.src('*.js', { read: false })
        .pipe(shell([
            'git tag -a ' + versionNum + ' -m " ' + versionMsg + '"'
        ]))
        .pipe(notify(onSuccess('Tagged Commit' + versionMsg)))
}));

// Push Release to Mercury
gulp.task('push', gulp.series('getVersion', function() {
    return gulp.src('*.js', { read: false })
        .pipe(shell([
            'git push origin mercury ' + versionNum
        ]))
        .pipe(notify(onSuccess('Push')))
}));

// Push Live
// Pushes dist folder to gh-pages branch
gulp.task('pushlive', gulp.series('getVersion', function() {
    return gulp.src('*.js', { read: false })
        .pipe(shell([
            'git subtree push --prefix dist origin gh-pages'
        ]))
        .pipe(notify(onSuccess('Push Live')))
}));

// Prep & Release
// gulp prep
// gulp bump   or gulp zipit
// gulp commit
// git push --tags
// gulp pushlive ( git subtree push --prefix dist origin gh-pages )

gulp.task('watchJS',      function() { gulp.watch(js_watchFolder,   ['js']            ) })
gulp.task('watchJSDebug', function() { gulp.watch(js_watchFolder,   ['js-debug']      ) })
gulp.task('watchJSProd',  function() { gulp.watch(js_watchFolder,   ['js-production'] ) })
gulp.task('watchLess',    function() { gulp.watch(less_watchFolder, ['styles']        ) })
gulp.task('watchPAGES',   function() { gulp.watch(htmlFiles,        ['html']          ) })
gulp.task('watchTPL',     function() { gulp.watch(tplFiles,         ['html']          ) })

gulp.task('bump',          function() { return bumpFunc( 'patch' ) });
gulp.task('bump-patch',    function() { return bumpFunc( 'patch' ) });
gulp.task('bump-minor',    function() { return bumpFunc( 'minor' ) });

gulp.task('archive',       function() { return archive() });

gulp.task('prep',   gulp.series('js-production', 'html', 'styles', 'copy', function(done) { done(); }));

gulp.task('bump',   gulp.series('bump-patch', 'clean', 'zip'));

gulp.task('zipit',  gulp.series('clean', 'zip'));

gulp.task('commit', gulp.series('add', 'commitV', 'tag'));

gulp.task('watch',     gulp.series('watchJS',     'watchLess', 'watchPAGES', 'watchTPL'))
gulp.task('watchProd', gulp.series('watchJSProd', 'watchLess', 'watchPAGES', 'watchTPL'))

gulp.task('build', gulp.series('js', 'html', 'styles', 'copy'));
gulp.task('build-debug', gulp.series('js-debug', 'html', 'styles', 'watchJSDebug', 'watchLess', 'watchPAGES', 'watchTPL'))

gulp.task('default', gulp.series('build', 'watch'));
