const connect = require('connect');
const http = require('http');
const third = require('../index');
const request = require('superagent');
const assert = require('assert');
const iconv = require('iconv-lite');

let app;
let server;

const startConnect = function (callback, opts) {
    app = connect();
    app.use('/post', third('post', callback, opts));
    server = http.createServer(app).listen('8000');
};
const createParser = (opts) => {
    opts = opts || {};
    const encoding = opts.encoding || 'utf-8';
    const chunks = [];
    return (res, fn) => {
        res.text = '';
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            try {
                const decodedText = iconv.decode(Buffer.concat(chunks), encoding);
                res.text = decodedText;
                fn(null, decodedText);
            }
            catch (e) {
                fn(e);
            }
        });
    };
};
const targetHTML = `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    </head>
                    <body>
                        <script>
                        const data = {"a":1,"b":2,"text":"中国"};
                        const callback = "callback";
                        (function () {
                            const supportPM = 'postMessage' in window;
                            const sendByPostMessage = function (data) {
                                window.parent.postMessage(data, '*');
                            };
                            const sendByNavigator = function (callback, data) {
                                const navigatorCallback = window.navigator[callback];
                                if (typeof navigatorCallback !== 'function') {
                                    return;
                                }

                                const DEFAULT_PORT_MAP = {
                                    http: 80,
                                    https: 443
                                };
                                const location = window.location;
                                const hostname = location.hostname;
                                const protocol = location.protocol;
                                const ptl = protocol.slice(0, -1);
                                const port = (location.port || DEFAULT_PORT_MAP[ptl] || 0) + '';
                                const useDefaultPort = (DEFAULT_PORT_MAP[ptl] + '') === port;
                                const host = hostname + (useDefaultPort  ? '' : (':' + port));
                                navigatorCallback({
                                    message: data + '',
                                    origin: protocol + '//' + host
                                });
                            };

                            if (supportPM) {
                                sendByPostMessage(data);
                            }
                            else {
                                sendByNavigator(callback, data);
                            }
                        })();
                        </script>
                    </body>
                    </html>`;

describe('post', function() {

    afterEach(function() {
        server.close();
    });

    it('POST without callback', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/post/1');
            assert(data.a === '1');
            assert(data.b[0] === 'mmzhou');
            assert(data.b[1] === 'zmmbreeze &_&');
            assert(data['_&_'] === 'false');
            return {
                a: 1,
                b: 2,
                text: '中国'
            };
        });

        request
            .post('http://localhost:8000/post/1')
            .type('form')
            .withCredentials()
            .send({
                a: 1,
                b: ['mmzhou', 'zmmbreeze &_&'],
                '_&_': false
            })
            .end((err, res) => {
                assert(res.body.a === 1);
                assert(res.body.b === 2);
                assert(res.body.text === '中国');
                assert(res.headers['content-type'] === 'application/json; charset=utf-8');
                assert(res.statusCode === 200);
                done();
            });
    });

    /*
    it('POST without callback with options', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/post/1?fakeEncoding=GBK');
            assert(data.a === '1');
            assert(data.b[0] === 'mmzhou');
            assert(data.b[1] === 'zmmbreeze &_&');
            assert(data['_&_'] === 'false');
            return {
                a: 1,
                b: 2,
                text: '中国'
            };
        }, {
            encodingKey: 'fakeEncoding'
        });

        request
            .post('http://localhost:8000/post/1')
            .query({
                fakeEncoding: 'GBK'
            })
            .type('form')
            .withCredentials()
            .send({
                a: 1,
                b: ['mmzhou', 'zmmbreeze &_&'],
                '_&_': false
            })
            .end((err, res) => {
                // console.log(res.text);
                assert(res.body.a === 1);
                assert(res.body.b === 2);
                assert(res.body.text === '中国');
                assert(res.headers['content-type'] === 'application/json; charset=utf-8');
                assert(res.statusCode === 200);
                done();
            });
    });
    */

    it('POST with callback', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/post/2?callback=callback');
            assert(data.a === '1');
            assert(data.b[0] === 'mmzhou');
            assert(data.b[1] === 'zmmbreeze &_&');
            assert(data['_&_'] === 'false');
            return {
                a: 1,
                b: 2,
                text: '中国'
            };
        });

        request
            .post('http://localhost:8000/post/2')
            .query({
                callback: 'callback'
            })
            .type('form')
            .send({
                a: 1,
                b: ['mmzhou', 'zmmbreeze &_&'],
                '_&_': false
            })
            .end((err, res) => {
                assert(res.text === targetHTML);
                assert(res.headers['content-type'] === 'text/html; charset=utf-8');
                assert(res.statusCode === 200);
                done();
            });
    });

    it('POST with callback with options', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/post/2?fakeCallback=callback&fakeEncoding=GBK');
            assert(data.a === '1');
            assert(data.b[0] === 'mmzhou');
            assert(data.b[1] === 'zmmbreeze &_&');
            assert(data['_&_'] === 'false');
            return {
                a: 1,
                b: 2,
                text: '中国'
            };
        }, {
            callbackKey: 'fakeCallback',
            encodingKey: 'fakeEncoding'
        });

        request
            .post('http://localhost:8000/post/2')
            .query({
                fakeCallback: 'callback',
                fakeEncoding: 'GBK'
            })
            .type('form')
            .send({
                a: 1,
                b: ['mmzhou', 'zmmbreeze &_&'],
                '_&_': false
            })
            .buffer()
            .parse(createParser({encoding: 'GBK'}))
            .end((err, res) => {
                assert(res.text === targetHTML);
                assert(res.headers['content-type'] === 'text/html; charset=GBK');
                assert(res.statusCode === 200);
                done();
            });
    });
});
