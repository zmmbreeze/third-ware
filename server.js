const connect = require('connect');
const http = require('http');
const third = require('./index');
const request = require('supertest');
const querystring = require('querystring');

const startConnect = (callback) => {
    const app = connect();
    app.use('/ping', third('ping', (data, req, res) => {
        console.log(`[PING]${req.url}`, data);
    }));
    app.use('/jsonp', third('jsonp', (data, req, res) => {
        console.log(`[JSONP]${req.url}`, data);
        return {
            data: 'test'
        };
    }, opts));
    app.use('/post', third('post', (data, req, res) => {
        console.log(`[POST]${req.url}`, data);
        return {
            data: 'test'
        };
    }, opts));
    http.createServer(app).listen('8000');
};

startConnect();
