"use strict";

var Promise = require('bluebird');
var test = require('tape');
var pathlib = require('path');
var fs = Promise.promisifyAll(require('fs'));

var dualapi = require('dualapi').use(require('..'));

var testTailFilename = pathlib.join(__dirname, '/data/testTail');
var testAppendFilename = pathlib.join(__dirname, '/data/testTailAppend');
var testNewFilename = pathlib.join(__dirname, '/data/testNewFile');
var testTailFileContent = fs.readFileSync(pathlib.join(__dirname, '/data/testTail')).toString();


test('dual-tail', function (t) {

    var testContext = function () {
        fs.writeFileSync(testAppendFilename, fs.readFileSync(testTailFilename));
        var additionalContent = '\nand now a third';
        var finalContent = testTailFileContent + additionalContent;
        return fs.unlinkAsync(testNewFilename)
            .catch(function (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            })
                .then(function () {
                    return [dualapi(), additionalContent, finalContent];
                });
    };

    t.test('transmits data to destination', function (s) {
        s.plan(1);
        testContext()
        .spread(function (d) {
            d.mount(['receiver'], function (body, ctxt) {
                s.pass('Received data');
            });
            d.tail(testTailFilename, ['receiver']);
        });
    });

    t.test('transmits initial content of data file', function (s) {
        s.plan(1);
        testContext()
        .spread(function (d) {
            var buffer = '';
            d.mount(['receiver'], function (body, ctxt) {
                buffer += body;
                if (buffer === testTailFileContent) {
                    s.pass('Received initial content');
                }
            });
            d.tail(testTailFilename, ['receiver']);
        });
    });

    t.test('transmits additional content modifications', function (s) {
        s.plan(1);
        testContext()
        .spread(function (d, additionalContent, finalContent) {
            var buffer = '';
            d.mount(['receiver'], function (body, ctxt) {
                buffer += body;
                if (buffer === finalContent) {
                    s.pass('Received updated content');
                }
            });
            d.tail(testAppendFilename, ['receiver']);
            setTimeout(function () {
                fs.appendFileSync(testAppendFilename, additionalContent);
            }, 25);
        });
    });

    t.test('transmits additional content modifications for newly created file', function (s) {
        s.plan(1);
        testContext()
        .spread(function (d, additionalContent, finalContent) {
            var buffer = '';
            d.mount(['receiver'], function (body, ctxt) {
                buffer += body;
                if (buffer === finalContent) {
                    s.pass('Received updated content');
                }
            });
            d.tail(testAppendFilename, ['receiver']);
            setTimeout(function () {
                fs.writeFileSync(testNewFilename)
            }, 25);
        });
    });

    t.test('takes no action on failure', function (s) {
        s.plan(1);
        testContext()
        .spread(function (d, additionalContent, finalContent) {
            var buffer = '';
            d.mount(['receiver'], function (body, ctxt) {
                s.fail('Received event on failure');
            });
            d.tail('.', ['receiver']);
            s.pass('Started . tail file');
        });
    });

    t.test('terminates tail on response', function (s) {
        s.plan(1);
        testContext()
        .spread(function (d, additionalContent, finalContent) {
            var bufferEvery = '';
            var bufferReceiver = '';
            var bufferLast = '';
            d.mount(['every'], function (body, ctxt) {
                bufferEvery += body;
                if (bufferEvery === finalContent) {
                    s.fail('Received entire content on every host');
                }
                ctxt.reply('Stop');
            });
            d.mount(['receiver'], function (body, ctxt) {
                bufferReceiver += body;
                if (bufferReceiver === finalContent) {
                    s.pass('Received updated content');
                }
            });
            d.mount(['last'], function (body, ctxt) {
                bufferLast += body;
                if (bufferEvery === testTailFileContent) {
                    s.fail('Received entire content on last host');
                }
                ctxt.reply('Stop');
            });
            d.tail(testAppendFilename, ['every']);
            d.tail(testAppendFilename, ['receiver']);
            d.tail(testAppendFilename, ['last']);
            setTimeout(function () {
                fs.appendFileSync(testAppendFilename, additionalContent);
            }, 25);
        });
    });
});
