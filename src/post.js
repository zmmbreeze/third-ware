const url = require('url');
const qs = require('qs');
const iconv = require('iconv-lite');
const bodyParser = require('body-parser');
const multiparty = require('multiparty');
const urlencodedParser = bodyParser.urlencoded({
    extended: true
});

module.exports = (callback, opts) => {
    opts = opts || {};
    const callbackNameKey = opts.callbackKey || 'callback';
    const encodingKey = opts.encodingKey || 'encoding';
    const defaultEncoding = opts.encoding || 'utf-8';
    if (!iconv.encodingExists(defaultEncoding)) {
        throw new Error(`[third-ware][post] Encoding "${defaultEncoding}" is not supported.`);
    }

    return (req, res, next) => {
        const queryParts = qs.parse(url.parse(req.url).query);
        let callbackName = queryParts[callbackNameKey];
        if (!callbackName.match(/^[0-9a-zA-Z_]+$/)) {
            next(new Error(`[third-ware][post] Wrong format for "${callbackNameKey}=${callbackName}".`));
            return;
        }

        let encoding = queryParts[encodingKey] || defaultEncoding;
        if (!iconv.encodingExists(encoding)) {
            encoding = defaultEncoding;
        }
        // no cache for ping request
        res.setHeader('Cache-Control', 'private, max-age=0, no-cache');
        res.setHeader('Pragma', 'no-cache');

        if (req.method === 'GET') {
            done(queryParts);
            return;
        }

        const contentType = req.headers['content-type'] || '';
        if (contentType.split(';')[0].toLowerCase() === 'multipart/form-data') {
            // multipart/form-data
            const form = new multiparty.Form();
            form.parse(req, (err, fields, files) => {
                const data = {};
                Object.keys(fields).forEach((name) => {
                    const fieldValues = fields[name];
                    data[name] = fieldValues.length === 1 ? fieldValues[0] : fieldValues;
                });

                Object.keys(files).forEach((name) => {
                    const fileValues = files[name];
                    data[name] = fileValues.length === 1 ? fileValues[0] : fileValues;
                });
                done(data);
            });
        }
        else {
            // application/x-www-form-urlencoded
            // POST, PUT, DELETE
            urlencodedParser(req, res, () => {
                done(req.body);
            });
        }

        function done(data) {
            let result = callback(data, req, res);
            if (result && typeof result.then === 'function') {
                result.then(end, (err) => {
                    next(err);
                });
            }
            else {
                end(result);
            }
        }

        function end(result) {
            if (result == null) {
                result = '';
            }
            const resultIsString = typeof result === 'string';
            if (!resultIsString) {
                result = JSON.stringify(result);
            }

            if (!callbackName) {
                const referer = req.headers.referer ? url.parse(req.headers.referer) : null;
                const refOrigin = referer ? `${referer.protocol}//${referer.host}` : '*';
                // POST return JSON
                const resultContentType = resultIsString ? 'text/plain' : 'application/json';
                res.setHeader('Content-Type', `${resultContentType}; charset=${encoding}`);
                res.setHeader('Access-Control-Allow-Origin', refOrigin);
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
            else {
                // html file
                res.setHeader('Content-Type', `text/html; charset=${encoding}`);
                callbackName = JSON.stringify(callbackName);
                result = `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <meta http-equiv="X-UA-Compatible" content="ie=edge">
                    </head>
                    <body>
                        <script>
                        const data = ${JSON.stringify(result)};
                        const callbackName = ${callbackName};
                        (function () {
                            const supportPM = 'postMessage' in window;
                            const sendByPostMessage = function (data) {
                                window.parent.postMessage(callbackName + data, '*');
                            };
                            const sendByNavigator = function (callback, data) {
                                const navigatorCallback = window.navigator[callbackName];
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
                                    message: callbackName + data + '',
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
            }

            const resultBuffer = iconv.encode(result, encoding);
            res.writeHead(200, {
                'Content-Length': Buffer.byteLength(resultBuffer)
            });
            res.end(resultBuffer);
            next();
        }
    };
};
