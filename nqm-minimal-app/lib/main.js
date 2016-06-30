/**
 * Created by toby on 18/10/15.
 */

module.exports = (function() {
  var log = require("debug")("AppProcess");
  var DDPClient = require("ddp");
  var config = require("./config.json");
  
  function AppProcess(args, watchdog) {
    this._args = require("minimist")(args);
    this._watchdog = watchdog;
    this._temperature = 20;
  }
  
  var simulateData = function() {
    var self = this;
    self._temperature += (0.5 - Math.random());
    var data = {
      timestamp: Date.now(),
      temperature: self._temperature 
    };
    self._ddpClient.call("/app/dataset/data/create",[this._args.datasetId, data], function(err) {
      if (err) {
        log("failed to send temperature data: %s", err.message);
      } else {
        log("sent temperature data: %j", data);
      }
    });
  };
  
  AppProcess.prototype.run = function() {
    var self = this;
    
    self._ddpClient = new DDPClient({
      host : config.xrhServer,
      port : config.xrhPort,
      ssl  : config.ssl || false,
      autoReconnect : true,
      autoReconnectTimer : config.autoReconnectTimer || 5000,
      maintainCollections : false,
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
        }
        setInterval(function() { simulateData.call(self); }, config.simulateInterval || 10000);
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
  
  return AppProcess;
}())