var http = require('http');
var path = require('path');
var mime = require('mime');
var fs = require('fs');
var cache = {};

function send404 (res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error: 404');
    res.end();
}

function sendFile (res, filePath, fileContent) {
    res.writeHead(200, {'Content-Type': mime.lookup(path.basename(filePath))});
    res.end(fileContent);
}

function serveStatic (res, cache, absPath) {
    if (cache[absPath]) {
        sendFile(res, absPath, cache[absPath]);

    } else {
        fs.exists(absPath, function (exists) {
            if (exists) {
                fs.readFile(absPath, function (err, data) {
                    if (err) {
                        send404(res);

                    } else {
                        cache[absPath] = data;
                        sendFile(res, absPath, data);
                    }
                });

            } else {
                send404(res);
            }
        });
    }
}

var server = http.createServer(function (req, res) {
    var filePath = false;

    if (req.url == '/') {
        filePath = 'public/index.html';

    } else {
        filePath = 'public' + req.url;
    }

    var absPath = './' + filePath;
    serveStatic(res, cache, absPath);
});

server.listen(3000, function () {
    console.log('Server listening on port 3000');
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);