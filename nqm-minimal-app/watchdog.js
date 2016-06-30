/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  var log = require("debug")("WatchdogProcess");
  var DDPClient = require("ddp");
  
  function WatchdogProcess(args) {
    this._args = require("minimist")(args);
    this._heartbeatInterval = this._args.heartbeat || 10000;
  }
  
  WatchdogProcess.prototype.run = function() {
    var self = this;
  
    self._heartbeatTimer = setInterval(function() {
      _checkHeartbeat.call(self);
    }, self._heartbeatInterval)

    _openConnection.call(this);
  };
  
  var _openConnection = function() {
    var self = this;
    
    self._ddpClient = new DDPClient({
      host : this._args.server,
      port : this._args.port,
      ssl  : this._args.ssl || false,
      autoReconnect : true,
      autoReconnectTimer : this._args.autoReconnectTimer || 5000,
      maintainCollections : true,
      ddpVersion : '1',
      useSockJs: false
    });
  
    self._ddpClient.connect(function(err, reconnect) {
      if (err) {
        log("DDP connection error: " + err.toString());
        self._connected = false;
      } else {
        self._connected = true;
        if (reconnect) {
          log("DDP re-connected");
        } else {
          log("DDP connected");
          _observe.call(self, "heartbeat", { added: _heartbeatObserverCB, changed: _heartbeatObserverCB });
          _observe.call(self, "app-" + self._args.appInst + "-actions", actionsObserver);
        }
        self._ddpClient.subscribe("heartbeat");
        self._ddpClient.subscribe("app-" + self._args.appInst + "-actions");
        self._ddpClient.call("appStarted", [self._args.appInst]);
        self._heartbeat = Date.now();
      }
    });
  
    self._ddpClient.on("socket-close", function() {
      log("DDP socket closed");
      self._connected = false;
    });
  
    self._ddpClient.on("socket-error", function(err) {
      log("DDP socket error: %s",err.message);
      self._connected = false;
    });
  };
  
  var _heartbeatObserverCB = function() {
    log("heartbeat");
    this._heartbeat = Date.now();
  };
  
  var _actionProcessor = function(action) {
    var self = this;
    
    switch (action.params.cmd) {
      case "stop":
        log("received stop action");
        self._ddpClient.call("completeAction", [self._args.instId, action.id, null, {ok: true}], function(err, result) {
          log("exiting NOW");
          if (err) {
            log("completeAction failed, stopping anyway: %s",err.message);
          }
          process.exit();
        });
        break;
      default:
        log("ignoring unknown action: %s",action.params.cmd);
        break;
    }
  };
  
  var actionsObserver = {
    added: function(appId) {
      log("new action: %s", appId);
      var newAction = this._ddpClient.collections["app-" + this._args.appInst + "-actions"][appId];
      _actionProcessor.call(this, newAction);
    },
    changed: function(id, oldFields, clearedFields, newFields) {
      log("new action: %s", newFields);
      _actionProcessor.call(this, newFields);
    },
    removed: function(action) {
      log("removed action: %s",action);
    }
  };
  
  var _observe = function(name, handlers) {
    log("starting observer for %s",name);
    var added = handlers.added ? handlers.added.bind(this) : null;
    var changed = handlers.changed ? handlers.changed.bind(this) : null;
    var removed = handlers.removed ? handlers.removed.bind(this) : null;
    return this._ddpClient.observe(name, added, changed, removed);
  };
  
  var _closeConnection = function() {
    if (this._ddpClient) {
      this._ddpClient.close(true);
    }
  };
  
  var _checkHeartbeat = function() {
    if (this._ddpClient && this._connected) {
      if (this._heartbeat + this._heartbeatInterval < Date.now()) {
        log("no heartbeat - closing connection");
        _closeConnection.call(this);
      } 
    }
  };
  
  return WatchdogProcess;
}());