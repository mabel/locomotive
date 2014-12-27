/**
 * Module dependencies.
 */
var prompt = require('co-prompt')
  , os = require('os')
  , fs = require('fs')
  , mkdirp = require('mkdirp');


/**
 * Create Locomotive application at `path`.
 *
 * @param {String} path
 * @api private
 */
exports = module.exports = function create(path) {
  console.log('creating Locomotive application at : ' + path);
  
  (function createApplication(path) {
    emptyDirectory(path, function(empty) {
      if (empty) {
        createApplicationAt(path);
      } else {
        prompt.confirm('destination is not empty, continue? ')(function(err, ok) {
          if (err) { throw err; }
          if (ok) {
            process.stdin.destroy();
            createApplicationAt(path);
          } else {
            abort('aborting');
          }
        });
      }
    });
  })(path);
};


var eol = 'win32' == os.platform() ? '\r\n' : '\n';

var pagesController = [
    'var locomotive = require(\'locomotive\')'
  , '  , Controller = locomotive.Controller;'
  , ''
  , 'var pagesController = new Controller();'
  , ''
  , 'function checkKey(ctrl){'
  , '	var req = ctrl.req;'
  , '	var res = ctrl.res;'
  , '  	if(!req.session || !req.session.key){'
  , '	  res.redirect(\'/nologin\');'
  , '      return false;'
  , '  	}'	  
  , '	return true;'
  , '}'
  , ''
  , 'pagesController.main = function() {'
  , '  if(!checkKey(this)) return;'
  , '  this.title = \'Locomotive\';'
  , '  this.render();'
  , '}'
  , ''
  , 'pagesController.before(\'login\', function(next) {'
  , ''
  , '	var ctrl = this'
  , ''
  , '  this.__app.passport.authenticate(\'local\', function(err, user, info) {'
  , '	  if(!err && user){'
  , '		  ctrl.req.session.key = \'yes\''
  , '	  }'
  , '	  next()'
  , '  })(this.__req, this.__res, this.__next);'
  , ''
  , '})'
  , ''
  , 'pagesController.login = function() {'
  , '    if(!checkKey(this)) return;'
  , '    this.res.redirect(\'/\')'
  , '}'
  , ''
  , 'pagesController.logout = function() {'
  , '	var req = this.req;'
  , '	var res = this.res;'
  , '    if(req.session) req.session.key = null;'
  , '	this.render();'
  , '}'
  , ''
  , 'module.exports = pagesController;'
].join(eol);

var mainTemplate = [
    '<!DOCTYPE html>'
  , '<html>'
  , '  <head>'
  , '    <title><%= title %></title>'
  , '    <link rel="stylesheet" href="/stylesheets/screen.css" />'
  , '  </head>'
  , '  <body>'
  , '    <h1><%= title %></h1>'
  , '    <p>Welcome aboard! Visit <a href="http://locomotivejs.org/">locomotivejs.org</a> for details.</p>'
  , '  </body>'
  , '</html>'
].join(eol);

var cssStylesheet = [
    'body {'
  , '  padding: 50px;'
  , '  font: 14px "Lucida Grande", Helvetica, Arial, sans-serif;'
  , '}'
  , ''
  , 'a {'
  , '  color: #00B7FF;'
  , '}'
].join(eol);

var routesTemplate = [
    '// Draw routes.  Locomotive\'s router provides expressive syntax for drawing'
  , '// routes, including support for resourceful routes, namespaces, and nesting.'
  , '// MVC routes can be mapped to controllers using convenient'
  , '// `controller#action` shorthand.  Standard middleware in the form of'
  , '// `function(req, res, next)` is also fully supported.  Consult the Locomotive'
  , '// Guide on [routing](http://locomotivejs.org/guide/routing.html) for additional'
  , '// information.'
  , 'module.exports = function routes() {'
  , '  this.root(\'pages#main\');'
  , '  this.match(\'/login\',   \'pages#login\', {via: \'POST\'});'
  , '  this.match(\'/nologin\', \'pages#logout\');'
  , '  this.match(\'/logout\',  \'pages#logout\');'
  , '}'
  , ''
].join(eol);

var allEnvironments = [
    'module.exports = function() {'
  , '  // Warn of version mismatch between global "lcm" binary and local installation'
  , '  // of Locomotive.'
  , '  //if (this.version !== require(\'locomotive\').version) {'
  , '  //  console.warn(\'version mismatch between local (%s) and global (%s) Locomotive module\', require(\'locomotive\').version, this.version);'
  , '  //}'
  , '}'
  , ''
].join(eol);

var configIndex = [
    'module.exports = {'
  , '  // port: 3333'
  , '}'
  , ''
].join(eol);

var developmentEnvironment = [
    'module.exports = function() {'
  , '}'
  , ''
].join(eol);

var productionEnvironment = [
    'module.exports = function() {'
  , '}'
  , ''
].join(eol);

var genericInitializer = [
    'module.exports = function() {'
  , '  // Any files in this directory will be `require()`\'ed when the application'
  , '  // starts, and the exported function will be invoked with a `this` context of'
  , '  // the application itself.  Initializers are used to connect to databases and'
  , '  // message queues, and configure sub-systems such as authentication.'
  , ''
  , '  // Async initializers are declared by exporting `function(done) { /*...*/ }`.'
  , '  // `done` is a callback which must be invoked when the initializer is'
  , '  // finished.  Initializers are invoked sequentially, ensuring that the'
  , '  // previous one has completed before the next one executes.'
  , '}'
  , ''
].join(eol);

var mimeInitializer = [
    'module.exports = function() {'
  , '  // Define custom MIME types.  Consult the mime module [documentation](https://github.com/broofa/node-mime)'
  , '  // for additional information.'
  , '  /*'
  , '  this.mime.define({'
  , '    \'application/x-foo\': [\'foo\']'
  , '  });'
  , '  */'
  , '}'
  , ''
].join(eol);

var viewsInitializer = [
    'module.exports = function() {'
  , '  // Configure view-related settings.  Consult the Express API Reference for a'
  , '  // list of the available [settings](http://expressjs.com/api.html#app-settings).'
  , '  this.set(\'views\', __dirname + \'/../../app/views\');'
  , '  this.set(\'view engine\', \'ejs\');'
  , ''
  , '  // Register EJS as a template engine.'
  , '  this.engine(\'ejs\', require(\'ejs\').__express);'
  , ''
  , '  // Override default template extension.  By default, Locomotive finds'
  , '  // templates using the `name.format.engine` convention, for example'
  , '  // `index.html.ejs`  For some template engines, such as Jade, that find'
  , '  // layouts using a `layout.engine` notation, this results in mixed conventions'
  , '  // that can cause confusion.  If this occurs, you can map an explicit'
  , '  // extension to a format.'
  , '  /* this.format(\'html\', { extension: \'.jade\' }) */'
  , ''
  , '  // Register formats for content negotiation.  Using content negotiation,'
  , '  // different formats can be served as needed by different clients.  For'
  , '  // example, a browser is sent an HTML response, while an API client is sent a'
  , '  // JSON or XML response.'
  , '  /* this.format(\'xml\', { engine: \'xmlb\' }); */'
  , '}'
  , ''
].join(eol);

var passportInitializer = [
    'var passport = require(\'passport\')'
  , '  , Strategy = require(\'passport-local\').Strategy;'
  , ''
  , 'module.exports = function() {'
  , ''
  , '  passport.use(new Strategy({}, function(user, password, done) {'
  , '     return done(null, true);'
  , '  }));'
  , '  this.passport = passport'
  , '}'
].join(eol);

var noLoginViewInitializer = [
    '<!doctype html>'
  , '<html class="no-js" lang="">'
  , '    <head>'
  , '        <meta charset="utf-8">'
  , '        <meta http-equiv="X-UA-Compatible" content="IE=edge">'
  , '        <title></title>'
  , '        <meta name="description" content="">'
  , '        <meta name="viewport" content="width=device-width, initial-scale=1">'
  , ''
  , '        <link rel="apple-touch-icon" href="apple-touch-icon.png">'
  , '        <!-- Place favicon.ico in the root directory -->'
  , ''
  , '        <link rel="stylesheet" href="css/normalize.css">'
  , '        <link rel="stylesheet" href="css/main.css">'
  , '        <script src="js/vendor/modernizr-2.8.3.min.js"></script>'
  , '		<style>	'
  , '			.lcm-login-wrap {'
  , '				position: absolute;'
  , '				top: 50%;'
  , '				left: 50%;'
  , '				margin: -90px 0px 0px -180px;'
  , '				border: 1px solid #808080;'
  , '				border-radius: 6px;'
  , '				height: 180px;'
  , '				width: 360px;'
  , '			}'
  , '			.lcm-login-wrap div {'
  , '				height: 60px;'
  , '				line-height: 60px;'
  , '			}'
  , '			.lcm-login-wrap label {'
  , '				width: 33%;'
  , '				margin: 0px 10px 0 0;'
  , '				display: inline-block;'
  , '				text-align: right;'
  , '			}'
  , '			.lcm-login-wrap div:nth-child(3) {'
  , '				text-align: center;'
  , '			}'
  , '		</style>'
  , '    </head>'
  , '    <body>'
  , '        <!--[if lt IE 8]>'
  , '            <p class="browserupgrade">You are using an <strong>outdated</strong> browser. Please <a href="http://browsehappy.com/">upgrade your browser</a> to improve your experience.</p>'
  , '        <![endif]-->'
  , ''
  , '		<div class="lcm-login-wrap">'
  , '			<form action="/login" method="post">'
  , '				<div>'
  , '					<label>Username:</label>'
  , '					<input type="text" name="username"/>'
  , '				</div>'
  , '				<div>'
  , '					<label>Password:</label>'
  , '					<input type="password" name="password"/>'
  , '				</div>'
  , '				<div>'
  , '					<input type="submit" value="Log In"/>'
  , '				</div>'
  , '			</form>'
  , '		</div>'
  , ''
  , '    </body>'
  , '</html>'
  , ''
].join(eol);

var middlewareInitializer = [
    'var express = require(\'express\')'
  , '  , poweredBy = require(\'connect-powered-by\')'
  , '  , methodOverride = require(\'method-override\')'
  , '  , bodyParser = require(\'body-parser\')'
  , ''
  , 'module.exports = function() {'
  , '	if (\'development\' == this.env) {'
  , '		this.use(express.logger());'
  , '	}'
  , '	this.use(poweredBy(\'Locomotive\'));'
  , '	this.use(express.favicon());'
  , '	this.use(express.static(__dirname + \'/../../public\'));'
  , '	this.use(bodyParser.json());'
  , '	this.use(bodyParser.urlencoded({extended: true}));'
  , '	this.use(express.session({ secret: \'nash parovoz vpered leti\' }));'
  , '	this.use(methodOverride());'
  , '	this.use(this.router);'
  , '	this.use(express.errorHandler());'
  , '	this.use(this.passport.initialize());'
  , '	this.use(this.passport.session());'
  , '}'
  , ''
].join(eol);

var serverJS = [
    'var locomotive = require(\'locomotive\')'
  , '  , bootable = require(\'bootable\')'
  , '  , config = require(\'./config\');'
  , ''
  , '// Create a new application and initialize it with *required* support for'
  , '// controllers and views.  Move (or remove) these lines at your own peril.'
  , 'var app = new locomotive.Application();'
  , 'app.phase(locomotive.boot.controllers(__dirname + \'/app/controllers\'));'
  , 'app.phase(locomotive.boot.views());'
  , ''
  , '// Add phases to configure environments, run initializers, draw routes, and'
  , '// start an HTTP server.  Additional phases can be inserted as needed, which'
  , '// is particularly useful if your application handles upgrades from HTTP to'
  , '// other protocols such as WebSocket.'
  , 'app.phase(require(\'bootable-environment\')(__dirname + \'/config/environments\'));'
  , 'app.phase(bootable.initializers(__dirname + \'/config/initializers\'));'
  , 'app.phase(locomotive.boot.routes(__dirname + \'/config/routes\'));'
  , 'app.phase(locomotive.boot.httpServer(config.port ? config.port : 3000, \'0.0.0.0\'));'
  , ''
  , '// Boot the application.  The phases registered above will be executed'
  , '// sequentially, resulting in a fully initialized server that is listening'
  , '// for requests.'
  , 'app.boot(function(err) {'
  , '  if (err) {'
  , '    console.error(err.message);'
  , '    console.error(err.stack);'
  , '    return process.exit(-1);'
  , '  }'
  , '});'
  , ''
].join(eol);

var packageJSON = [
    '{'
  , '  "name": "app-name",'
  , '  "version": "0.0.1",'
  , '  "private": true,'
  , '  "dependencies": {'
  , '    "locomotive": "0.4.x",'
  , '    "bootable": "0.2.x",'
  , '    "bootable-environment": "0.2.x",'
  , '    "express": "3.x.x",'
  , '    "connect-powered-by": "0.1.x",'
  , '    "body-parser": "^1.10.0",'
  , '    "method-override": "^2.3.0",'
  , '    "passport": "^0.2.1",'
  , '    "passport-local": "^1.0.0",'
  , '    "validole": "^0.0.0",'
  , '    "ejs": "0.8.x"'
  , '  },'
  , '  "scripts": {'
  , '    "start": "node server.js"'
  , '  }'
  , '}'
  , ''
].join(eol);

/**
 * Create application at the given directory `path`.
 *
 * @param {String} path
 */
function createApplicationAt(path) {
  console.log();
  process.on('exit', function(){
    console.log();
    console.log('   install dependencies:');
    console.log('     $ cd %s && npm install', path);
    console.log();
    console.log('   run the app:');
    console.log('     $ node server');
    console.log();
  });
  
  mkdir(path, function() {
    mkdir(path + '/app');
    mkdir(path + '/app/controllers', function(){
      write(path + '/app/controllers/pagesController.js', pagesController);
    });
    mkdir(path + '/app/views');
    mkdir(path + '/app/views/pages', function(){
      write(path + '/app/views/pages/main.html.ejs', mainTemplate);
      write(path + '/app/views/pages/logout.html.ejs', noLoginViewInitializer);
    });
    
    mkdir(path + '/config', function(){
      write(path + '/config/routes.js', routesTemplate);
      write(path + '/config/index.js',  configIndex);
    });
    mkdir(path + '/config/environments', function(){
      write(path + '/config/environments/all.js', allEnvironments);
      write(path + '/config/environments/development.js', developmentEnvironment);
      write(path + '/config/environments/production.js', productionEnvironment);
    });
    mkdir(path + '/config/initializers', function(){
      write(path + '/config/initializers/00_generic.js', genericInitializer);
      write(path + '/config/initializers/01_mime.js', mimeInitializer);
      write(path + '/config/initializers/02_views.js', viewsInitializer);
      write(path + '/config/initializers/29_passport.js', passportInitializer);
      write(path + '/config/initializers/30_middleware.js', middlewareInitializer);
    });
    
    mkdir(path + '/public');
    //mkdir(path + '/public/stylesheets', function(){
    //  write(path + '/public/stylesheets/screen.css', cssStylesheet);
    //});
    
    write(path + '/package.json', packageJSON);
    write(path + '/server.js', serverJS);
  });
}

/**
 * Check if the given directory `path` is empty.
 *
 * @param {String} path
 * @param {Function} fn
 */
function emptyDirectory(path, fn) {
  fs.readdir(path, function(err, files){
    if (err && 'ENOENT' != err.code) { throw err; }
    fn(!files || !files.length);
  });
}

/**
 * Mkdir -p.
 *
 * @param {String} path
 * @param {Function} fn
 */
function mkdir(path, fn) {
  mkdirp(path, 0755, function(err){
    if (err) { throw err; }
    console.log('   \033[36mcreate\033[0m : ' + path);
    fn && fn();
  });
}

/**
 * echo str > path.
 *
 * @param {String} path
 * @param {String} str
 */
function write(path, str) {
  fs.writeFile(path, str);
  console.log('   \x1b[36mcreate\x1b[0m : ' + path);
}

/**
 * Exit with the given `str`.
 *
 * @param {String} str
 */
function abort(str) {
  console.error(str);
  process.exit(1);
}
