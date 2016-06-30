/**
 * Created by toby on 18/10/15.
 */

module.exports = (function() {
  "use strict";
  var log = require("debug")("common");
  var http = require("http");
  var https = require("https");

  var basicRequest = function(options, data, onResult) {
    var protocol = options.port == 443 ? https : http;
    
    // Required to avoid EAI_BADFLAGS error on android.
    options.family = 4;
    
    var req = protocol.request(options, function(res) {
      var output = '';
      log(options.hostname + ':' + res.statusCode);
      res.setEncoding('utf8');
      
      res.on('data', function (chunk) {
        output += chunk;
      });
      
      res.on('end', function() {
        onResult(res.statusCode, output);
      });
    });
    
    req.on('error', function(err) {
      log("request error: ",err);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  };
  
  return {
    httpRequest: basicRequest
  }  
}());