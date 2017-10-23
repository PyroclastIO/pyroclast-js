'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var assert = require('assert');

function renameKeys(obj, kmap) {
  return Object.keys(obj).reduce(function (renamed, k) {
    renamed[kmap[k] || k] = obj[k];
    return renamed;
  }, {});
}

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
        region = _opts$region === undefined ? 'us-west-2' : _opts$region,
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

function deployment(client, queryCriteria) {
  var path = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  var url = client.options.endpoint + '/v1/deployments/' + client.options.deploymentId + path;

  return client.fetchImpl(url, {
    method: 'POST',
    headers: {
      'Authorization': client.options.readApiKey,
      'Content-Type': 'application/json'
    },
    body: queryCriteria && JSON.stringify(queryCriteria),
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

var alphanumeric = /^[\d\w-]+$/;

var PyroclastAdminClient = exports.PyroclastAdminClient = function (_BaseClient) {
  _inherits(PyroclastAdminClient, _BaseClient);

  function PyroclastAdminClient() {
    _classCallCheck(this, PyroclastAdminClient);

    return _possibleConstructorReturn(this, (PyroclastAdminClient.__proto__ || Object.getPrototypeOf(PyroclastAdminClient)).apply(this, arguments));
  }

  _createClass(PyroclastAdminClient, [{
    key: 'requiredOptions',
    value: function requiredOptions() {
      return ['masterKey'];
    }
  }, {
    key: 'createTopic',
    value: function createTopic(topicName) {
      var _this2 = this;

      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref$retentionBytes = _ref.retentionBytes,
          retentionBytes = _ref$retentionBytes === undefined ? 2147483648 : _ref$retentionBytes,
          _ref$retentionMs = _ref.retentionMs,
          retentionMs = _ref$retentionMs === undefined ? 259200000 : _ref$retentionMs;

      return this.fetchImpl(this.options.endpoint + '/v1/topics', {
        method: 'POST',
        body: JSON.stringify({
          name: topicName,
          'retention-bytes': retentionBytes,
          'retention-ms': retentionMs
        }),
        headers: {
          'Authorization': this.options.masterKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 201) return res.json().then(function (tr) {
          var conformed = renameKeys(tr, {
            'read-key': 'readApiKey',
            'id': 'topicId',
            'write-key': 'writeApiKey' });
          return new PyroclastTopicClient(Object.assign({}, _this2.options, conformed));
        });
        handleResponseError(res);
      });
    }
  }, {
    key: 'getTopics',
    value: function getTopics() {
      var _this3 = this;

      return this.fetchImpl(this.options.endpoint + '/v1/topics', {
        method: 'GET',
        headers: {
          'Authorization': this.options.masterKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 200) {
          return res.json().then(function (topicList) {
            return topicList.map(function (topic) {
              var conformed = renameKeys(topic, {
                'read-key': 'writeApiKey',
                'id': 'topicId',
                'write-key': 'readApiKey'
              });
              return new PyroclastTopicClient(Object.assign({}, _this3.options, conformed));
            });
          });
        }
        handleResponseError(res);
      });
    }
  }]);

  return PyroclastAdminClient;
}(BaseClient);

var PyroclastTopicClient = exports.PyroclastTopicClient = function (_BaseClient2) {
  _inherits(PyroclastTopicClient, _BaseClient2);

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
      assertKeys(event, ['value']);
      return this.fetchImpl(this.options.endpoint + '/v1/topics/' + this.options.topicId + '/produce', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'Authorization': this.options.writeApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 200) return true;
        handleResponseError(res);
      });
    }
  }, {
    key: 'sendEvents',
    value: function sendEvents(events) {
      assertKeys(this.options, ['writeApiKey']);
      events.forEach(function (event) {
        return assertKeys(event, ['value']);
      });
      return this.fetchImpl(this.options.endpoint + '/v1/topics/' + this.options.topicId + '/bulk-produce', {
        method: 'POST',
        body: JSON.stringify(events),
        headers: {
          'Authorization': this.options.writeApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 200) return true;
        handleResponseError(res);
      });
    }
  }, {
    key: 'subscribe',
    value: function subscribe(consumerGroupName) {
      var _this5 = this;

      var _ref2 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          _ref2$autoOffsetReset = _ref2.autoOffsetReset,
          autoOffsetReset = _ref2$autoOffsetReset === undefined ? 'earliest' : _ref2$autoOffsetReset,
          _ref2$partitions = _ref2.partitions,
          partitions = _ref2$partitions === undefined ? "all" : _ref2$partitions;

      assertKeys(this.options, ['readApiKey']);
      if (!alphanumeric.test(consumerGroupName)) {
        throw new Error('Subscriber name must be a non-empty string of alphanumeric characters');
      }
      return this.fetchImpl(this.options.endpoint + '/v1/topics/' + this.options.topicId + '/consumers/' + consumerGroupName + '/subscribe', {
        method: 'POST',
        body: JSON.stringify({ "auto.offset.reset": autoOffsetReset, partitions: partitions }),
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 201) {
          return res.json().then(function (json) {
            return new PyroclastConsumerInstance(Object.assign({}, _this5.options, {
              consumerGroupId: json['group-id'],
              consumerInstanceId: json['consumer-instance-id']
            }));
          });
        }
        handleResponseError(res);
      });
    }
  }]);

  return PyroclastTopicClient;
}(BaseClient);

var PyroclastConsumerInstance = exports.PyroclastConsumerInstance = function (_PyroclastTopicClient) {
  _inherits(PyroclastConsumerInstance, _PyroclastTopicClient);

  function PyroclastConsumerInstance() {
    _classCallCheck(this, PyroclastConsumerInstance);

    return _possibleConstructorReturn(this, (PyroclastConsumerInstance.__proto__ || Object.getPrototypeOf(PyroclastConsumerInstance)).apply(this, arguments));
  }

  _createClass(PyroclastConsumerInstance, [{
    key: 'requiredOptions',
    value: function requiredOptions() {
      return ['topicId', 'consumerGroupId', "consumerInstanceId"];
    }
  }, {
    key: 'poll',
    value: function poll() {
      assertKeys(this.options, ['readApiKey']);
      return this.fetchImpl(this.options.endpoint + '/v1/topics/' + this.options.topicId + '/consumers/' + this.options.consumerGroupId + '/instances/' + this.options.consumerInstanceId + '/poll', {
        method: 'POST',
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 200) {
          return res.json();
        }
        handleResponseError(res);
      });
    }
  }, {
    key: 'commit',
    value: function commit() {
      assertKeys(this.options, ['writeApiKey']);
      return this.fetchImpl(this.options.endpoint + '/v1/topics/' + this.options.topicId + '/consumers/' + this.options.consumerGroupId + '/instances/' + this.options.consumerInstanceId + '/commit', {
        method: 'POST',
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 200) {
          return true;
        }
        handleResponseError(res);
      });
    }
  }, {
    key: '_simpleSeek',
    value: function _simpleSeek(direction) {
      assertKeys(this.options, ['writeApiKey']);
      return this.fetchImpl(this.options.endpoint + '/v1/topics/' + this.options.topicId + '/consumers/' + this.options.consumerGroupId + '/instances/' + this.options.consumerInstanceId + '/seek/' + direction, {
        method: 'POST',
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 200) {
          return true;
        }
        handleResponseError(res);
      });
    }
  }, {
    key: 'seekBeginning',
    value: function seekBeginning() {
      return this._simpleSeek("beginning");
    }
  }, {
    key: 'seekEnd',
    value: function seekEnd() {
      return this._simpleSeek("end");
    }
  }, {
    key: 'seek',
    value: function seek(partitionPositions) {
      assertKeys(this.options, ['writeApiKey']);
      partitionPositions.forEach(function (p) {
        assertKeys(p, ['partition']);
        assert(p.hasOwnProperty('offset') || p.hasOwnProperty('timestamp'), "partitionPosition entry must contain either offset or timestamp");
      });

      return this.fetchImpl(this.options.endpoint + '/v1/topics/' + this.options.topicId + '/consumers/' + this.options.consumerGroupId + '/instances/' + this.options.consumerInstanceId + '/seek', {
        method: 'POST',
        body: JSON.stringify(partitionPositions),
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then(function (res) {
        if (res.status === 200) {
          return true;
        }
        handleResponseError(res);
      });
    }
  }]);

  return PyroclastConsumerInstance;
}(PyroclastTopicClient);

var PyroclastDeploymentClient = exports.PyroclastDeploymentClient = function (_BaseClient3) {
  _inherits(PyroclastDeploymentClient, _BaseClient3);

  function PyroclastDeploymentClient() {
    _classCallCheck(this, PyroclastDeploymentClient);

    return _possibleConstructorReturn(this, (PyroclastDeploymentClient.__proto__ || Object.getPrototypeOf(PyroclastDeploymentClient)).apply(this, arguments));
  }

  _createClass(PyroclastDeploymentClient, [{
    key: 'requiredOptions',
    value: function requiredOptions() {
      return ['readApiKey', 'deploymentId'];
    }
  }, {
    key: 'readAggregates',
    value: function readAggregates() {
      return deployment(this, {}, '/aggregates');
    }
  }, {
    key: 'readAggregate',
    value: function readAggregate(aggregateName) {
      var queryCriteria = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return deployment(this, queryCriteria, '/aggregates/' + aggregateName);
    }
  }]);

  return PyroclastDeploymentClient;
}(BaseClient);

function handleResponseError(res) {
  var msg = void 0;
  switch (res.status) {
    case 400:
      msg = 'Malformed event data';
      break;
    case 401:
      msg = 'API key is not authorized to perform this action';
      break;
    case 500:
      msg = 'Server Error';
      break;
    default:
      msg = res.statusText || 'unknown';
  }

  var err = new Error(msg);
  err.status = res.status;
  err.responseHeaders = res.headers;
  throw err;
}
