"use strict";

var fs = require('fs');

module.exports = function (Domain) {
    Domain.prototype.tail = function (filename, destination) {
        var d = this;
        return d.uid()
            .then(function (mailbox) {
                var source = [mailbox];
                var bufCount = 0;
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
                        stream.close();
                        stream = null;
                    });
                };
                var watchListener = function () {
                    startStream();
                };
                fs.watchFile(filename, watchListener);
                startStream();
                d.waitFor(source)
                    .then(function () {
                        fs.unwatchFile(filename, watchListener);
                        stream.close();
                    });
            });
    }
};
