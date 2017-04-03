const connect = require('connect');
const http = require('http');
const third = require('../index');
const request = require('superagent');
const assert = require('assert');

let app;
let server;

const startConnect = function (callback) {
    app = connect();
    app.use('/ping', third('ping', callback));
    server = http.createServer(app).listen('8000');
};

describe('ping', function() {

    afterEach(function() {
        server.close();
    });

    it('GET', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/get?a=1&b=mmzhou&b=zmmbreeze%20%26_%26&_%26_=false');
            assert(data.a === '1');
            assert(data.b[0] === 'mmzhou');
            assert(data.b[1] === 'zmmbreeze &_&');
            assert(data['_&_'] === 'false');
        });

        request
            .get('http://localhost:8000/ping/get')
            .query({
                a: 1,
                b: ['mmzhou', 'zmmbreeze &_&'],
                '_&_': false
            })
            .end((err, res) => {
                assert(res.headers['content-length'] === '43');
                assert(res.headers['content-type'] === 'image/gif');
                assert(res.statusCode === 200);
                done();
            });
    });

    it('POST', function(done) {
        startConnect((data, req, res) => {
            assert(req.url === '/post');
            assert(data.a === '1');
            assert(data.b[0] === 'mmzhou');
            assert(data.b[1] === 'zmmbreeze &_&');
            assert(data['_&_'] === 'false');
        });

        request
            .post('http://localhost:8000/ping/post')
            .type('form')
            .withCredentials()
            .send({
                a: 1,
                b: ['mmzhou', 'zmmbreeze &_&'],
                '_&_': false
            })
            .end((err, res) => {
                assert(res.headers['content-length'] === '0');
                assert(res.headers['content-type'] === 'text/plain');
                assert(res.statusCode === 200);
                done();
            });
    });
});
