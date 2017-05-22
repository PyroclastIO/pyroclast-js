'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function send(client, topicId, payloadKind, payload) {
    var url = client.endpoint + '/api/v' + client.version + '/topic/' + topicId + '/' + payloadKind;

    return client.fetchImpl(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Authorization': client.writeApiKey,
            'Content-Type': 'application/json'
        },
        credentials: client.credentialsMode
    }).then(function (res) {
        var msg = void 0;
        switch (res.status) {
            case 200:
                return res.json();
            case 400:
                msg = 'Malformed event data';
                break;
            case 401:
                msg = 'API key is not authorized to perform this action';
                break;
            default:
                msg = res.statusText || 'unknown';
        }

        var err = new Error(msg);
        err.status = res.status;
        err.responseHeaders = res.headers;
        throw err;
    });
}

function defaultFetch() {
    if ('undefined' !== typeof process && Object.prototype.toString.call(process) === '[object process]') {
        return require('node-fetch');
    }

    if (window.hasOwnProperty('fetch')) {
        return window.fetch;
    }

    throw new Error('No fetch implmentation found. Provide support via polyfill or by supplying the `fetchImpl` option.');
}

var PyroclastClient = exports.PyroclastClient = function () {
    function PyroclastClient(_ref) {
        var writeApiKey = _ref.writeApiKey,
            endpoint = _ref.endpoint,
            _ref$version = _ref.version,
            version = _ref$version === undefined ? 1 : _ref$version,
            _ref$credentialsMode = _ref.credentialsMode,
            credentialsMode = _ref$credentialsMode === undefined ? 'include' : _ref$credentialsMode,
            _ref$fetchImpl = _ref.fetchImpl,
            fetchImpl = _ref$fetchImpl === undefined ? defaultFetch() : _ref$fetchImpl;

        _classCallCheck(this, PyroclastClient);

        if (!writeApiKey || !endpoint) {
            throw new Error('Required configuration not specified.');
        }

        this.writeApiKey = writeApiKey;
        this.endpoint = endpoint;
        this.version = version;
        this.fetchImpl = fetchImpl;
    }

    _createClass(PyroclastClient, [{
        key: 'sendEvent',
        value: function sendEvent(topicId, event) {
            return send(this, topicId, 'event', event);
        }
    }, {
        key: 'sendEvents',
        value: function sendEvents(topicId, events) {
            return send(this, topicId, 'events', events);
        }
    }]);

    return PyroclastClient;
}();
