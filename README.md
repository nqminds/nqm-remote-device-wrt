# nqm-remote-device-wrt #

Added the following changes to config.json:
```
"hostname": "192.168.100.1",
"xrhServer": "192.168.100.1",
"hostURL": "mylinkit.local:8125",
```
# Run #

Run nqm-remote-device-wrt with the command line, it will listen on the 8125 port for browser connections and 2222 for DDP connections:

node --harmony_proxies index.js
