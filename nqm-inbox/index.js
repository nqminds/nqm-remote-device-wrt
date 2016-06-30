/**
 * Created by toby on 17/10/15.
 */

(function() {
  "use strict";
  
  var WatchDog = require("./watchdog");
  var watcher = new WatchDog(process.argv.slice(2));
  watcher.run();
  
  var App = require("./lib/main");
  var app = new App(process.argv.slice(2), watcher);
  return app.run();
}());

