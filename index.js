"use strict";

var fs = require('fs');

module.exports = function (Domain) {
    Domain.prototype.tail = function (filename, destination) {
        var d = this;
        return fs.readFile(filename, function (err, data) {
            if (err) {
                console.error('dual-tail error: ', err, err.stack);
                return;
            }
            d.send(destination, [], data.toString());
        });
    }
};
