"use strict";

var fs = require('fs');

module.exports = function (Domain) {
    Domain.prototype.tail = function (filename, destination) {
        var d = this;
        return d.uid()
            .then(function (mailbox) {
                var source = [mailbox];
                var bufCount = 0;
                var birthTime = null;
                var stream;
                var startStream = function () {
                    if (stream) {
                        stream.close();
                    }
                    stream = fs.createReadStream(filename, {
                        start: bufCount
                    });
                    stream.on('data', function (data) {
                        bufCount += data.length;
                        d.send(destination, source, data.toString());
                    });
                    stream.on('error', function (err) {
                        if (err.code !== 'ENOENT') {
                            console.error('dual-tail error: ', err, err.stack);
                        }
                        stream = null;
                    });
                    stream.on('end', function () {
                        if (stream) {
                            stream.close();
                        }
                        stream = null;
                    });
                };
                var watchListener = function (event, filename) {
                    if (event === 'rename') {
                        bufCount = 0;
                    }
                    startStream();
                };
                var watcher = null;
                var startWatch = function () {
                    try {
                        watcher = fs.watch(filename, watchListener);
                    } catch (err) {
                        watcher = null;
                        if (err.code === 'ENOENT') {
                            setTimeout(startWatch, 1);
                        } else {
                            console.error('dual-tail error: ', err, err.stack);
                        }
                        return;
                    }
                    startStream();
                };
                startWatch();
                d.waitFor(source)
                    .then(function () {
                        if (watcher) {
                            watcher.close();
                            watcher = null;
                        }
                        if (stream) {
                            stream.close();
                            stream = null;
                        }
                    });
            });
    }
};
