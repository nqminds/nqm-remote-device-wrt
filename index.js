/**
 * Created by toby on 13/10/15.
 */

var log = require("debug")("index");
var _config = require("./config.json");
var Application = require("./application");
Application.start(_config);

