var assert = require('assert')

function renameKeys(obj, kmap) {
  return Object.keys(obj).reduce((renamed, k) => {
    renamed[kmap[k] || k] = obj[k];
    return renamed;
  }, {});
}

function defaultFetch() {
  if ('undefined' !== typeof process &&
    Object.prototype.toString.call(process) === '[object process]') {
    return require('node-fetch');
  }

  if (window.hasOwnProperty('fetch')) {
    return (...args) => window.fetch.apply(window, args);
  }

  throw new Error('No fetch implementation found. Provide support via polyfill or by supplying the `fetchImpl` option.');
}

function assertKeys(obj, ks) {
  const missing = ks.find((k) => !obj.hasOwnProperty(k));
  if (missing) {
    throw new Error(`Required key not specified: ${missing}.`);
  }
}

class BaseClient {
  constructor(opts) {
    assertKeys(opts, this.requiredOptions());

    const {
      credentialsMode = 'include',
      fetchImpl = defaultFetch(),
      region = 'us-west-2',
      endpoint
    } = opts;

    opts.endpoint = endpoint || `https://api.${region}.pyroclast.io`;

    this.credentialsMode = credentialsMode;
    this.fetchImpl = fetchImpl;
    this.options = opts;
  }

  requiredOptions() {
    return [];
  }
}

function deployment(client, queryCriteria, path = '') {
  const url = `${client.options.endpoint}/v1/deployments/${client.options.deploymentId}${path}`;

  return client.fetchImpl(url, {
    method: 'POST',
    headers: {
      'Authorization': client.options.readApiKey,
      'Content-Type': 'application/json'
    },
    body: queryCriteria && JSON.stringify(queryCriteria),
    credentials: client.credentialsMode
  }).then((res) => {
    let msg;
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

    let err = new Error(msg);
    err.status = res.status;
    err.responseHeaders = res.headers;
    throw err;
  });
}

const alphanumeric = /^[\d\w-]+$/;

export class PyroclastAdminClient extends BaseClient {
  requiredOptions() {
    return ['masterKey']
  }

  createTopic(topicName, {retentionBytes = 2147483648, retentionMs = 259200000} = {}){
    return this.fetchImpl(`${this.options.endpoint}/v1/topics`,
      {
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
      }).then((res) => {
      if (res.status === 201) return res.json()
        .then((tr) => {
          var conformed = renameKeys(tr,{
            'read-key': 'readApiKey',
            'id': 'topicId',
            'write-key': 'writeApiKey'});
          return new PyroclastTopicClient(Object.assign({}, this.options, conformed))
        });
      handleResponseError(res)
    })
  }

  getTopics(){
    return this.fetchImpl(`${this.options.endpoint}/v1/topics`,
      {
        method: 'GET',
        headers: {
          'Authorization': this.options.masterKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 200) {
        return res.json()
          .then((topicList) => {
            return topicList.map((topic) => {
              var conformed = renameKeys(topic, {
                'read-key': 'writeApiKey',
                'id': 'topicId',
                'write-key': 'readApiKey'
              });
              return new PyroclastTopicClient(Object.assign({}, this.options, conformed))
            })
          });
      }
      handleResponseError(res)
    })
  }
}
export class PyroclastTopicClient extends BaseClient {
  requiredOptions() {
    return ['topicId']
  }

  sendEvent(event) {
    assertKeys(this.options, ['writeApiKey']);
    assertKeys(event, ['value']);
    return this.fetchImpl(`${this.options.endpoint}/v1/topics/${this.options.topicId}/produce`,
      {
        method: 'POST',
        body: JSON.stringify(event),
        headers: {
          'Authorization': this.options.writeApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 200) return true;
      handleResponseError(res)
    })
  }

  sendEvents(events) {
    assertKeys(this.options, ['writeApiKey']);
    events.forEach((event) => assertKeys(event, ['value']));
    return this.fetchImpl(`${this.options.endpoint}/v1/topics/${this.options.topicId}/bulk-produce`,
      {
        method: 'POST',
        body: JSON.stringify(events),
        headers: {
          'Authorization': this.options.writeApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 200) return true;
      handleResponseError(res)
    })
  }

  subscribe(consumerGroupName, {autoOffsetReset = 'earliest', partitions = "all"} = {}) {
    assertKeys(this.options, ['readApiKey']);
    if (!alphanumeric.test(consumerGroupName)) {
      throw new Error('Subscriber name must be a non-empty string of alphanumeric characters');
    }
    return this.fetchImpl(`${this.options.endpoint}/v1/topics/${this.options.topicId}/consumers/${consumerGroupName}/subscribe`,
      {
        method: 'POST',
        body: JSON.stringify({"auto.offset.reset": autoOffsetReset, partitions}),
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 201) {
        return res.json().then(
          (json) => {
            return new PyroclastConsumerInstance(
              Object.assign({}, this.options, {
                consumerGroupId: json['group-id'],
                consumerInstanceId: json['consumer-instance-id']
              }))
          }
        )
      }
      handleResponseError(res)
    })
  }

}

export class PyroclastConsumerInstance extends PyroclastTopicClient {
  requiredOptions() {
    return ['topicId', 'consumerGroupId', "consumerInstanceId"]
  }

  poll() {
    assertKeys(this.options, ['readApiKey']);
    return this.fetchImpl(`${this.options.endpoint}/v1/topics/${this.options.topicId}/consumers/${this.options.consumerGroupId}/instances/${this.options.consumerInstanceId}/poll`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 200) {
        return res.json()
      }
      handleResponseError(res)
    })
  }

  commit() {
    assertKeys(this.options, ['writeApiKey']);
    return this.fetchImpl(`${this.options.endpoint}/v1/topics/${this.options.topicId}/consumers/${this.options.consumerGroupId}/instances/${this.options.consumerInstanceId}/commit`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 200) {
        return true
      }
      handleResponseError(res)
    })
  }

  _simpleSeek(direction) {
    assertKeys(this.options, ['writeApiKey']);
    return this.fetchImpl(`${this.options.endpoint}/v1/topics/${this.options.topicId}/consumers/${this.options.consumerGroupId}/instances/${this.options.consumerInstanceId}/seek/${direction}`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 200) {
        return true
      }
      handleResponseError(res)
    })
  }

  seekBeginning() {
    return this._simpleSeek("beginning");
  }

  seekEnd() {
    return this._simpleSeek("end");
  }

  seek(partitionPositions) {
    assertKeys(this.options, ['writeApiKey']);
    partitionPositions.forEach(
      (p) => {
        assertKeys(p, ['partition']);
        assert((p.hasOwnProperty('offset') || p.hasOwnProperty('timestamp')), "partitionPosition entry must contain either offset or timestamp");
      });

    return this.fetchImpl(`${this.options.endpoint}/v1/topics/${this.options.topicId}/consumers/${this.options.consumerGroupId}/instances/${this.options.consumerInstanceId}/seek`,
      {
        method: 'POST',
        body: JSON.stringify(partitionPositions),
        headers: {
          'Authorization': this.options.readApiKey,
          'Content-Type': 'application/json'
        },
        credentials: this.credentialsMode
      }).then((res) => {
      if (res.status === 200) {
        return true
      }
      handleResponseError(res)
    })
  }
}

export class PyroclastDeploymentClient extends BaseClient {
  requiredOptions() {
    return ['readApiKey', 'deploymentId'];
  }

  readAggregates() {
    return deployment(this, {}, '/aggregates');
  }

  readAggregate(aggregateName, queryCriteria = {}) {
    return deployment(this, queryCriteria, `/aggregates/${aggregateName}`);
  }
}

function handleResponseError(res) {
  let msg;
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

  let err = new Error(msg);
  err.status = res.status;
  err.responseHeaders = res.headers;
  throw err;
}