/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("appServer");
  var DDPServer = require("ddp-server-reactive");
  var shortId = require("shortid");
  var common = require("./common");
  var fs = require("fs");
  var path = require("path");
  var util = require("util");
  var _config;
  var _ddpServer;
  var _xrh;
  var _heartbeat;
  var _appActions = {};
  var _methods = require("./methods");
  var _publications = {};
  var _actionCallbacks = {};
  var _appStartCallbacks = {};
  
  var _start = function(config, httpServer, xrh) {
    _config = config;
    _xrh = xrh;
    _ddpServer = new DDPServer({ httpServer: httpServer });

    _startHeartbeat(_config.heartbeatInterval);
    
    // Add methods
    var methods = _methods(config, this, _xrh);
    _ddpServer.methods(methods);
  };

  var _startHeartbeat = function(interval) {
    // Publish heartbeat collection.
    _heartbeat = _ddpServer.publish("heartbeat");
  
    // Start heartbeat.
    setInterval(function() {
      log("sending heartbeat");
      _heartbeat[0] = { hb: 1 };
    }, interval);
  };
  
  var _getPublication = function(name) {
    if (!_publications[name]) {
      _publications[name] = _ddpServer.publish(name);
    }
    return _publications[name];
  };
  
  var _publishAction = function(app, params, cb) {
    var name = "app-" + app.appId;
    var action = {
      id: shortId.generate(),
      params: params
    };
    _actionCallbacks[action.id] = cb;
    if (_appActions[name]) {
      _appActions[name][action.id] = action;
    } else {
      if (cb) {
        process.nextTick(cb);
      }
    }
  };
  
  var _completeAppAction = function(instId, actionId, err, result) {
    log("completing action %s", actionId);
    if (err) {
      log("action error: %s",err.message);
    } else {
      log("action result: ",result);
    }
    if (_actionCallbacks[actionId]) {
      _actionCallbacks[actionId](err, result);
      delete _actionCallbacks[actionId];
    }
    if (_appActions[instId]) {
      var name = "app-" + instId;
      delete _appActions[name][actionId]
    }
  };
  
  var _installApp = function(app, cb) {
    var http = require('http');
    var path = require("path");
    var fs = require('fs');
    var unzip = require("extract-zip");
    
    var filePath = path.join(_config.appDownloadPath,app.appId);
    var file = fs.createWriteStream(filePath);
    var request = http.get(app.appURL, function(response) {
      response.pipe(file);
      file.on("finish", function() {
        log("file downloaded");
        file.close(function() {
          var appPath = path.join(_config.appsPath,app.appId);
          unzip(filePath, { dir: appPath }, function(err) {
            fs.unlink(filePath);
            cb(err);
          });
        })
      });
    });
    
    request.on("error", function(err) {
      log("failed to download: %s", err.message);
      fs.unlink(filePath);
      cb(err);
    });
  };
  
  var _removeApp = function(app,cb) {
    var rimraf = require("rimraf");
    var appPath = path.join(_config.appsPath,app.appId);
    rimraf(appPath,cb);
  };
  
  var _stopApp = function(app, cb) {
    _publishAction(app, { cmd: "stop" }, function(err, result) {
      // At this point the client will have completed the action.
      var name = "app-" + app.appId;
      if (_appActions[name]) {
        // Clear any pending actions.
        log("clearing existing app actions for %s",name);
        var keys = Object.keys(_appActions[name]);
        for (var k in keys) {
          delete _appActions[name][keys[k]];
        }
      }
      cb(err, result);
    });
  };
  
  var _startApp = function(app, cb) {
    _startAppActions(app.id);
    
    var spawn = require('child_process').spawn;
    var nodePath = util.format("%snode",_config.nodePath);
    var appArgs = util.format("index.js --appInst=%s --server=%s --port=%d", app.appId, _config.hostname, _config.port).split(" ");
    appArgs = appArgs.concat(app.params.split(" "));
    var cwd = path.resolve(util.format("%s/%s",_config.appsPath,app.appId));
  
    var out = fs.openSync(path.join(cwd,'./out.log'), 'a');
    var err = fs.openSync(path.join(cwd,'./out.log'), 'a');
    
    _appStartCallbacks[app.appId] = cb;
    log("starting app:");
    log("%s %j", nodePath, appArgs);
    log("cwd: %s", cwd);
    var child = spawn(nodePath, appArgs, { cwd: cwd, stdio: ["ignore", out, err], detached: true });
    child.unref();
  };

  var _startAppActions = function(appId) {
    var name = "app-" + appId;
    if (!_appActions[name]) {
      log("starting publications for application id %s [%s-actions]", name, name);
      _appActions[name] = _ddpServer.publish(name + "-actions");
    } else {
      // Clear any existing actions.
      log("clearing existing app actions for %s",name);
      var keys = Object.keys(_appActions[name]);
      for (var k in keys) {
        delete _appActions[name][keys[k]];
      }
    }
  };
  
  var _appStartedCallback = function(instId) {
    _startAppActions(instId);
    
    if (_appStartCallbacks[instId]) {
      _appStartCallbacks[instId]();
    }
  };
  
  return {
    start:             _start,
    getPublication:    _getPublication,
    publishAppAction:  _publishAction,
    completeAppAction: _completeAppAction,
    installApp:        _installApp,
    removeApp:         _removeApp,
    startApp:          _startApp,
    stopApp:           _stopApp,
    appStartedCallback: _appStartedCallback
  }
}());

