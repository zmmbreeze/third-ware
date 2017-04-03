const jsonp = require('./src/jsonp');
const ping = require('./src/ping');
const post = require('./src/post');

const METHOD_MAP = {
    jsonp,
    ping,
    post
};

const third = function (method, callback, opts) {
    var createMethod = METHOD_MAP[method];
    return createMethod(callback, opts);
};

module.exports = third;
