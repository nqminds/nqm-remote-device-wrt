/**
 * Created by toby on 18/10/15.
 * Modified by Alex on 2/06/16.
 */

module.exports = (function() {
	var log = require("debug")("AppProcess");
	var config = require("./config.json");
	var base64url = require("base64url");
	var http = require("http");
	var https = require("https");
	var querystring = require("querystring");
	var fs = require('fs');
	var google = require('googleapis');
	var googleAuth = require('google-auth-library');
	var _accessToken;

	var CMD_GET_MSG = "/message?id=";
	var CMD_GET_PAGE = "/page?id=";

	var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
	var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
		process.env.USERPROFILE) + '/.credentials/';
	var TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';
	var oauth2Client;

  // Load client secrets from a local file.                                      
  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      log('Error loading client secret file: ' + err);
      return;
    }
    log("client_secrets.json Loaded.");
	authorize(JSON.parse(content));
  });

function AppProcess(args, watchdog) {
	this._args = require("minimist")(args);
    this._watchdog = watchdog;
}
 
/**                                                                            
 * Create an OAuth2 client with the given credentials, and then execute the    
 * given callback function.                                                    
 *                                                                             
 * @param {Object} credentials The authorization client credentials.           
 * @param {function} callback The callback to call with the authorized client. 
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var auth = new googleAuth();
	oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
	
	// Check if we have previously stored a token.                               
	fs.readFile(TOKEN_PATH, function(err, token) {
    	if (err) {
    		console.log("Get new Token for client!!!");
    		return;
    	} else {
      		oauth2Client.credentials = JSON.parse(token);
			log(oauth2Client.credentials.access_token);
    	}
	});
}

function getBody(message) {
	var encodedBody = '';
	if(typeof message.parts === 'undefined')
		encodedBody = message.body.data;
	else
		encodedBody = getHTMLPart(message.parts);
	//encodedBody = encodedBody.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
    //return decodeURIComponent(escape(window.atob(encodedBody)));
	return base64url.decode(encodedBody);
}

function getHTMLPart(arr) {
	for(var x = 0; x <= arr.length; x++) {
		if(typeof arr[x].parts === 'undefined') {
			if(arr[x].mimeType === 'text/html')
				return arr[x].body.data;
		} else
			return getHTMLPart(arr[x].parts);
	}

	return '';
}

AppProcess.prototype.run = function() {
	var self = this;
    
    var express = require('express');
    var app = express();
    var path = require("path");
  
    app.set("views", __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.static(__dirname  + '/public'));
    
    app.get('/', function (req, res) {
      res.redirect("/inbox");
    });
    
    var getMessages = function(o2c, page_token, maxResults, cb) {
		var gmail = google.gmail('v1');
		var maillist = [];
        var itemproc = 0;
		var token_str='';

		if (page_token!='0') token_str = page_token;

        gmail.users.messages.list({
            auth: o2c,
            userId: 'me',
			pageToken: token_str
            }, function(err, response) {
				msgid = 0;
                if (err) {
                    log('The API returned an error: ' + err);
                    return;
                }
                for (var idx in response.messages) {
                    gmail.users.messages.get({
                        auth: o2c,
                        userId: 'me',
                        id: response.messages[idx].id,
                        format: 'metadata',
                        metadataHeaders: ['From', 'Subject', 'Date']
                    }, function(err, gmailres){
						var fromfield, subjectfield, datefield;
						console.log(err);
                        if ( gmailres.labelIds.indexOf('INBOX')>-1 ) {
							for (var i=0;i<3; i++) {   
                        		if (gmailres.payload.headers[i].name=='From')
									fromfield = gmailres.payload.headers[i].value;
								else if (gmailres.payload.headers[i].name=='Subject')
                                    subjectfield = gmailres.payload.headers[i].value;
                                else if (gmailres.payload.headers[i].name=='Date')
                                    datefield = gmailres.payload.headers[i].value;
							}    
							//console.log(fromfield+":"+subjectfield+":"+datefield);   
							maillist.push({id:msgid++, msgid:gmailres.id, folder:'1', from:fromfield, subject:subjectfield, date:datefield, prevpage:page_token, nextpage:response.nextPageToken});
                        }
                        if(++itemproc==response.messages.length)
							cb(maillist);
                    });
                }
        });       
    };
    
    app.get("/inbox", function(req, res) {
		log("In Inbox");
/*
		var testmaillist = [{id:0, msgid:'12324daf83343', folder:'1', from:'Alex <alex@test.com>', subject:'One subject', date:'12/05/2016'},
							{id:1, msgid:'8wu9283jkd939', folder:'1', from:'Bob <bob@mail.com>', subject:'Two subject', date:'7/04/2016'},
							{id:2, msgid:'98u2839jo39kx', folder:'1', from:'Ivan <ivan@gmail.com>', subject:'Three subject', date:'14/01/2016'},
							{id:3, msgid:'02938lskdll92', folder:'1', from:'George <goerge@hotmail.com>', subject:'Four subject', date:'8/03/2016'},
							{id:4, msgid:'1298nvbpkoepw', folder:'1', from:'Claire <claire@yahoo.com>', subject:'Five subject', date:'1/02/2016'}];
		res.render("inbox", { messages: testmaillist });
*/

///*
		getMessages(oauth2Client, '0', 0, function(maillist){
			res.render("inbox", { messages: maillist });
		});
//*/		
    });

	app.get(/page/, function(req, res){
		getMessages(oauth2Client, req.url.substr(CMD_GET_PAGE.length), 0, function(maillist){
			res.end({messages: maillist});
		});		
	});
 
	app.get(/message/, function(req, res){
		var gmail = google.gmail('v1');
		gmail.users.messages.get({
        	auth: oauth2Client,
        	userId: 'me',
        	id: req.url.substr(CMD_GET_MSG.length),
        	format: 'full'
       		}, function(err, gmailres){
				var htmlcode = getBody(gmailres.payload);
				if (htmlcode=='')
					res.end("Error parsing.");
				else res.end(htmlcode);
/*
				console.log(gmailres.payload.mimeType+":"+gmailres.payload.body.size);
				if (gmailres.payload.mimeType == "multipart/alternative") {
					for (var idx in gmailres.payload.parts) {
						if (gmailres.payload.parts[idx].mimeType == "text/html") {
							res.end(base64url.decode(gmailres.payload.parts[idx].body.data));
						}	
					}	
				} if (gmailres.payload.mimeType == "text/html") {
					res.end(base64url.decode(gmailres.payload.body.data));
				} else {
					res.end("Error");
				}
*/
        });
	});
 
    var server = app.listen(3000, function () {
    	var host = server.address().address;
    	var port = server.address().port;
    
    	console.log('Example app listening at http://%s:%s', host, port);
    });
};
	return AppProcess;
}())
