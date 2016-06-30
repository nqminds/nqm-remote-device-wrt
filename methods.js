/**
 * Created by toby on 17/10/15.
 */

module.exports = (function() {
  var log = require("debug")("methods");

  return function(config, appServer, xrhConnection) {
    var _sendAppStatusToXRH = function(cmd, app) {
      xrhConnection.call(cmd, [config.appDatasetId, app], function(err, result) {
        if (err) {
          log("command failed: %s: %j", cmd, err);
        } else {
          log("command OK: %s: %j", cmd, result);
          
          // Command successful => update local cache while waiting for sync.
          var publication = appServer.getPublication("data-" + config.appDatasetId);
          publication[app.id].status = app.status;
        }
      });
    };
    
    var _setAppStatus = function(status, app) {
      log("setAppStatus %s to %s", app.appId, status);

      var currentStatus = app.status;
      switch (status) {
        case "run":
          app.status = "starting";
          appServer.startApp(app, function(err, result) {
            if (err) {
              log("failed to set status to %s", app.status);
              app.status = currentStatus;
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            } else {
              app.status = "running";
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            }
          });
          appServer.publishAppAction(app, { cmd: "start" });
          break;
        case "install":
          app.status = "installing";
          appServer.installApp(app, function(err, result) {
            if (err) {
              log("failed to set status to %s", app.status);
              app.status = currentStatus;
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            } else {
              app.status = "stopped";
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            }
          });
          break;
        case "stop":
          app.status = "stopping";
          appServer.stopApp(app, function(err, result) {
            if (err) {
              log("failed to set status to %s", app.status);
              app.status = currentStatus;
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            } else {
              app.status = "stopped";
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            }
          });
          break;
        case "uninstall":
          app.status = "removing";
          appServer.removeApp(app, function(err,result) {
            if (err) {
              log("failed to remove app %s: %s",app.appId,err.message);
              app.status = currentStatus;
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            } else {
              app.status = "pendingInstall";
              _sendAppStatusToXRH("/app/dataset/data/update", app);
            }
          });
          break;
        default:
          log("unknown status: %s",status);
          break;
      }
    
      log("setting (possibly interim) action status: %s", app.status);
      _sendAppStatusToXRH("/app/dataset/data/update", app);

      return true;
    };
    
    var _completeAction = function(instId, actionId, err, result) {
      appServer.completeAppAction(instId, actionId, err, result);
    };
  
    var _appStartedNotification = function(instId) {
      appServer.appStartedCallback(instId);
    };
    
    return {
      appStarted: _appStartedNotification,
      setAppStatus: _setAppStatus,
      completeAction: _completeAction
    }
  };
}());