'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function defaultFetch() {
    if ('undefined' !== typeof process && Object.prototype.toString.call(process) === '[object process]') {
        return require('node-fetch');
    }

    if (window.hasOwnProperty('fetch')) {
        return window.fetch;
    }

    throw new Error('No fetch implmentation found. Provide support via polyfill or by supplying the `fetchImpl` option.');
}

var BaseClient = function () {
    function BaseClient(opts) {
        _classCallCheck(this, BaseClient);

        var missingOption = this.requiredOptions().find(function (k) {
            return !opts.hasOwnProperty(k);
        });

        if (missingOption) {
            throw new Error('Required configuration not specified: ' + missingOption + '.');
        }

        var _opts$credentialsMode = opts.credentialsMode,
            credentialsMode = _opts$credentialsMode === undefined ? 'include' : _opts$credentialsMode,
            _opts$fetchImpl = opts.fetchImpl,
            fetchImpl = _opts$fetchImpl === undefined ? defaultFetch() : _opts$fetchImpl;


        this.credentialsMode = credentialsMode;
        this.fetchImpl = fetchImpl;
        this.options = opts;
    }

    _createClass(BaseClient, [{
        key: 'requiredOptions',
        value: function requiredOptions() {
            return [];
        }
    }]);

    return BaseClient;
}();

function write(client, path, payload) {
    var url = client.options.endpoint + '/api/v1/topic/' + client.options.topicId + path;

    return client.fetchImpl(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Authorization': client.options.writeApiKey,
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

var PyroclastTopicClient = exports.PyroclastTopicClient = function (_BaseClient) {
    _inherits(PyroclastTopicClient, _BaseClient);

    function PyroclastTopicClient() {
        _classCallCheck(this, PyroclastTopicClient);

        return _possibleConstructorReturn(this, (PyroclastTopicClient.__proto__ || Object.getPrototypeOf(PyroclastTopicClient)).apply(this, arguments));
    }

    _createClass(PyroclastTopicClient, [{
        key: 'requiredOptions',
        value: function requiredOptions() {
            return ['endpoint', 'topicId', 'writeApiKey'];
        }
    }, {
        key: 'sendEvent',
        value: function sendEvent(event) {
            return write(this, '/event', event);
        }
    }, {
        key: 'sendEvents',
        value: function sendEvents(events) {
            return write(this, '/events', events);
        }
    }]);

    return PyroclastTopicClient;
}(BaseClient);

function read(client) {
    var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var url = client.options.endpoint + '/api/v1/service/' + client.options.serviceId + path;

    return client.fetchImpl(url, {
        method: 'GET',
        headers: {
            'Authorization': client.options.readApiKey
        },
        credentials: client.credentialsMode
    }).then(function (res) {
        var msg = void 0;
        switch (res.status) {
            case 200:
                return res.json();
            case 401:
                msg = 'API key is not authorized to perform this action';
                break;
            case 404:
                msg = 'Not found';
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

var PyroclastServiceClient = exports.PyroclastServiceClient = function (_BaseClient2) {
    _inherits(PyroclastServiceClient, _BaseClient2);

    function PyroclastServiceClient() {
        _classCallCheck(this, PyroclastServiceClient);

        return _possibleConstructorReturn(this, (PyroclastServiceClient.__proto__ || Object.getPrototypeOf(PyroclastServiceClient)).apply(this, arguments));
    }

    _createClass(PyroclastServiceClient, [{
        key: 'requiredOptions',
        value: function requiredOptions() {
            return ["readApiKey", "serviceId", "endpoint"];
        }
    }, {
        key: 'readAggregates',
        value: function readAggregates() {
            return read(this);
        }
    }, {
        key: 'readAggregate',
        value: function readAggregate(aggregateName) {
            return read(this, '/aggregate/' + aggregateName);
        }
    }, {
        key: 'readAggregateGroup',
        value: function readAggregateGroup(aggregateName, groupName) {
            return read(this, '/aggregate/' + aggregateName + '/group/' + groupName);
        }
    }]);

    return PyroclastServiceClient;
}(BaseClient);
