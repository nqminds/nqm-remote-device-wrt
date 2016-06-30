/**
 * Created by toby on 14/10/15.
 */
  
module.exports = (function() {
  "use strict";
  var log = require("debug")("xrhConnection");
  var DDPClient = require("ddp");
  var _config;
  var _accessToken;
  var _ddpClient;
  var _connected = false;
  var _authenticated = false;
  
  var ddpInitialise = function(config, onConnect) {
    if (_ddpClient) return;
    
    _config = config;
    
    _ddpClient = new DDPClient({
      host : _config.xrhServer,
      port : _config.xrhPort,
      ssl  : _config.ssl || false,
      autoReconnect : true,
      autoReconnectTimer : _config.autoReconnectTimer || 5000,
      maintainCollections : true,
      ddpVersion : '1',
      useSockJs: false
    });

    _ddpClient.connect(function(err, reconnect) {
      if (err) {
        log("DDP connection error: " + err.toString());
        _connected = false;
        onConnect(err);
      } else {
        _connected = true;
        _accessToken = "";
        onConnect(null,reconnect);
        if (reconnect) {
          log("DDP re-connected");
        }
        log("DDP connected");
      }
    });
  
    _ddpClient.on("socket-close", function() {
      _connected = _authenticated = false;
    });
  
    _ddpClient.on("socket-error", function(err) {
      log("socket error: %s",err.message);
      _connected = _authenticated = false;
    });     
  };
  
  /*
   * Authenticate using a capability token.
   * Needs work.
   */
  var ddpAuthenticateCapability = function(cb) {
    if (!_connected) {
      log("not connected");
    }
    _ddpClient.call("/app/auth", [_config.capCredentials], function(err, result) {
      log("callback");
      cb(err, result);
    });
  };
  
  /*
   * Authenticate using a google access token.
   */
  var ddpAuthenticate = function(token, cb) {
    if (!_connected || _authenticated) {
      log("not connected or already authenticated");
      return;
    } 
    _ddpClient.call("/app/oauth", ["google",token], function(err, result) {
      log("ddpAuthenticate callback");
      if (!err) {
        _authenticated = true;
      }
      cb(err, result);
    });
  };
  
  var ddpSubscribe = function(publication, params, cb) {
    if (!_connected || !_authenticated) {
      log("ddpSubscribe - not connected or authenticated");
      process.nextTick(function() { cb(new Error("not connected or authenticated")); });
    }
    _ddpClient.subscribe(publication, [params], cb);
  };
  
  var ddpObserve = function(collection, handlers) {
    var observer = _ddpClient.observe(collection);
    observer.added = function(id) {
      log("[ADDED] to " + observer.name + ":  " + id);
      if (handlers.added) {
        handlers.added(id);
      }
    };
    observer.changed = function(id, oldFields, clearedFields, newFields) {
      log("[CHANGED] in " + observer.name + ":  " + id);
      log("[CHANGED] old field values: ", oldFields);
      log("[CHANGED] cleared fields: ", clearedFields);
      log("[CHANGED] new fields: ", newFields);
      if (handlers.changed) {
        handlers.changed(id, oldFields, clearedFields, newFields);
      }
    };
    observer.removed = function(id, oldValue) {
      log("[REMOVED] in " + observer.name + ":  " + id);
      log("[REMOVED] previous value: ", oldValue);
      if (handlers.removed) {
        handlers.removed(id, oldValue);
      }
    };
    return observer;
  };
  
  var call = function(cmd, params, cb) {
    return _ddpClient.call(cmd, params, cb);
  };
  
  var getCollection = function(name) {
    return _ddpClient.collections[name];
  };
  
  return {
    start: ddpInitialise,
    authenticate: ddpAuthenticate,
    subscribe: ddpSubscribe,
    observe: ddpObserve,
    collection: getCollection,
    call: call
  }
}());

