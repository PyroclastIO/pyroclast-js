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
        return function () {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            return window.fetch.apply(window, args);
        };
    }

    throw new Error('No fetch implementation found. Provide support via polyfill or by supplying the `fetchImpl` option.');
}

function assertKeys(obj, ks) {
    var missing = ks.find(function (k) {
        return !obj.hasOwnProperty(k);
    });
    if (missing) {
        throw new Error('Required key not specified: ' + missing + '.');
    }
}

var BaseClient = function () {
    function BaseClient(opts) {
        _classCallCheck(this, BaseClient);

        assertKeys(opts, this.requiredOptions());

        var _opts$credentialsMode = opts.credentialsMode,
            credentialsMode = _opts$credentialsMode === undefined ? 'include' : _opts$credentialsMode,
            _opts$fetchImpl = opts.fetchImpl,
            fetchImpl = _opts$fetchImpl === undefined ? defaultFetch() : _opts$fetchImpl,
            _opts$region = opts.region,
            region = _opts$region === undefined ? 'us-east-1' : _opts$region,
            endpoint = opts.endpoint;


        opts.endpoint = endpoint || 'https://api.' + region + '.pyroclast.io';

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

function topic(client, apiKey, path, payload) {
    var url = client.options.endpoint + '/v1/topics/' + client.options.topicId + path;
    var body = void 0;

    if (payload) {
        body = JSON.stringify(payload);
    }

    return client.fetchImpl(url, {
        method: 'POST',
        body: body,
        headers: {
            'Authorization': apiKey,
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

var alphanumeric = /^[\d\w-]+$/;

var PyroclastTopicClient = exports.PyroclastTopicClient = function (_BaseClient) {
    _inherits(PyroclastTopicClient, _BaseClient);

    function PyroclastTopicClient() {
        _classCallCheck(this, PyroclastTopicClient);

        return _possibleConstructorReturn(this, (PyroclastTopicClient.__proto__ || Object.getPrototypeOf(PyroclastTopicClient)).apply(this, arguments));
    }

    _createClass(PyroclastTopicClient, [{
        key: 'requiredOptions',
        value: function requiredOptions() {
            return ['topicId'];
        }
    }, {
        key: 'sendEvent',
        value: function sendEvent(event) {
            assertKeys(this.options, ['writeApiKey']);
            return topic(this, this.options.writeApiKey, '/produce', event);
        }
    }, {
        key: 'sendEvents',
        value: function sendEvents(events) {
            assertKeys(this.options, ['writeApiKey']);
            return topic(this, this.options.writeApiKey, '/bulk-produce', events);
        }
    }, {
        key: 'subscribe',
        value: function subscribe(subscriberName) {
            assertKeys(this.options, ['readApiKey']);
            if (!alphanumeric.test(subscriberName)) {
                throw new Error('Subscriber name must be a non-empty string of alphanumeric characters');
            }
            return topic(this, this.options.readApiKey, '/subscribe/' + subscriberName);
        }
    }, {
        key: 'poll',
        value: function poll(subscriberName) {
            assertKeys(this.options, ['readApiKey']);
            return topic(this, this.options.readApiKey, '/poll/' + subscriberName);
        }
    }, {
        key: 'commit',
        value: function commit(subscriberName) {
            assertKeys(this.options, ['readApiKey']);
            return topic(this, this.options.readApiKey, '/poll/' + subscriberName + '/commit');
        }
    }]);

    return PyroclastTopicClient;
}(BaseClient);

function service(client) {
    var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var url = client.options.endpoint + '/v1/services/' + client.options.serviceId + path;

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
            return ['readApiKey', 'serviceId'];
        }
    }, {
        key: 'readAggregates',
        value: function readAggregates() {
            return service(this);
        }
    }, {
        key: 'readAggregate',
        value: function readAggregate(aggregateName) {
            return service(this, '/aggregates/' + aggregateName);
        }
    }, {
        key: 'readAggregateGroup',
        value: function readAggregateGroup(aggregateName, groupName) {
            return service(this, '/aggregates/' + aggregateName + '/group/' + groupName);
        }
    }]);

    return PyroclastServiceClient;
}(BaseClient);
