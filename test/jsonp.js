const connect = require('connect');
const http = require('http');
const third = require('../index');
const request = require('superagent');
const assert = require('assert');
const iconv = require('iconv-lite');

let app;
let server;
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
const startConnect = function (callback, opts) {
    app = connect();
    app.use('/jsonp', third('jsonp', callback, opts));
    server = http.createServer(app).listen('8000');
};

describe('jsonp', function() {

    afterEach(function() {
        server.close();
    });

    it('GET without callback', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/test?encoding=GBK&otherData=12345');
            assert(data.otherData === '12345');
            return {
                a: 1,
                b: 2
            };
        });

        request
            .get('http://localhost:8000/jsonp/test')
            .query({
                encoding: 'GBK',
                otherData: 12345
            })
            .buffer()
            .parse(createParser({encoding: 'GBK'}))
            .end((err, res) => {
                assert(res.text === '{"a":1,"b":2}');
                assert(res.header['content-type'] === 'application/json; charset=GBK');
                assert(res.statusCode === 200);
                done();
            });
    });

    it('GET JSON data', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/test?callback=jsFunction&encoding=GBK&otherData=12345');
            assert(data.otherData === '12345');
            return {
                a: 1,
                b: 2
            };
        });

        request
            .get('http://localhost:8000/jsonp/test')
            .query({
                callback: 'jsFunction',
                encoding: 'GBK',
                otherData: 12345
            })
            .buffer()
            .parse(createParser({encoding: 'GBK'}))
            .end((err, res) => {
                assert(res.text === 'jsFunction({"a":1,"b":2})');
                assert(res.header['content-type'] === 'application/javascript; charset=GBK');
                assert(res.statusCode === 200);
                done();
            });
    });

    it('GET promised JSON data', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/test?callback=jsFunction&encoding=GBK&otherData=12345');
            assert(data.otherData === '12345');
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve({
                        a: 1,
                        b: 2
                    });
                }, 200);
            });
        });

        request
            .get('http://localhost:8000/jsonp/test')
            .query({
                callback: 'jsFunction',
                encoding: 'GBK',
                otherData: 12345
            })
            .buffer()
            .parse(createParser({encoding: 'GBK'}))
            .end((err, res) => {
                assert(res.text === 'jsFunction({"a":1,"b":2})');
                assert(res.header['content-type'] === 'application/javascript; charset=GBK');
                assert(res.statusCode === 200);
                done();
            });
    });

    it('GET with UTF-8 encoding', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/test?callback=jsFunction&otherData=12345');
            assert(data.otherData === '12345');
            return '中国 === China';
        });

        request
            .get('http://localhost:8000/jsonp/test')
            .query({
                callback: 'jsFunction',
                otherData: 12345
            })
            .buffer()
            .parse(createParser())
            .end((err, res) => {
                assert(res.text === 'jsFunction("中国 === China")');
                assert(res.header['content-type'] === 'application/javascript; charset=utf-8');
                assert(res.statusCode === 200);
                done();
            });
    });

    it('GET with GBK encoding', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/test?callback=jsFunction&encoding=GBK&otherData=12345');
            assert(data.otherData === '12345');
            return '中国 === China';
        });

        request
            .get('http://localhost:8000/jsonp/test')
            .query({
                callback: 'jsFunction',
                encoding: 'GBK',
                otherData: 12345
            })
            .buffer()
            .parse(createParser({encoding: 'GBK'}))
            .end((err, res) => {
                assert(res.text === 'jsFunction("中国 === China")');
                assert(res.header['content-type'] === 'application/javascript; charset=GBK');
                assert(res.statusCode === 200);
                done();
            });
    });

    it('GET with options', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/test?fakeCallback=jsFunction&fakeEncoding=GBK&otherData=12345');
            assert(data.otherData === '12345');
            return '中国 === China';
        }, {
            callbackKey: 'fakeCallback',
            encodingKey: 'fakeEncoding'
        });

        request
            .get('http://localhost:8000/jsonp/test')
            .query({
                fakeCallback: 'jsFunction',
                fakeEncoding: 'GBK',
                otherData: 12345
            })
            .buffer()
            .parse(createParser({encoding: 'GBK'}))
            .end((err, res) => {
                assert(res.text === 'jsFunction("中国 === China")');
                assert(res.header['content-type'] === 'application/javascript; charset=GBK');
                assert(res.statusCode === 200);
                done();
            });
    });
});
