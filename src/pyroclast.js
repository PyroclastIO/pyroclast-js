function defaultFetch() {
    if('undefined' !== typeof process && 
       Object.prototype.toString.call(process) === '[object process]') {
        return require('node-fetch');
    }

    if(window.hasOwnProperty('fetch')) {
        return (...args) => window.fetch.apply(window, args);
    }

    throw new Error('No fetch implementation found. Provide support via polyfill or by supplying the `fetchImpl` option.');
}

function assertKeys(obj, ks) {
    const missing = ks.find((k) => !obj.hasOwnProperty(k));
    if(missing) {
        throw new Error(`Required key not specified: ${missing}.`);
    }
}

class BaseClient {
    constructor(opts) {
        assertKeys(opts, this.requiredOptions());

        const {
            credentialsMode='include',
            fetchImpl=defaultFetch(),
            region='us-east-1',
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

function topic(client, apiKey, path, payload) {
    const url = `${client.options.endpoint}/v1/topics/${client.options.topicId}${path}`;
    let body;

    if(payload) {
        body = JSON.stringify(payload);
    }

    return client.fetchImpl(url, {
        method: 'POST',
        body,
        headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
        },
        credentials: client.credentialsMode
    }).then((res) => {
        let msg;
        switch(res.status) {
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

        let err = new Error(msg);
        err.status = res.status;
        err.responseHeaders = res.headers;
        throw err;
    });
}

const alphanumeric = /^[\d\w-]+$/;

export class PyroclastTopicClient extends BaseClient {
    requiredOptions() {
        return ['topicId'];
    }

    sendEvent(event) {
        assertKeys(this.options, ['writeApiKey']);
        return topic(this, this.options.writeApiKey, '/produce', event);
    }

    sendEvents(events) {
        assertKeys(this.options, ['writeApiKey']);
        return topic(this, this.options.writeApiKey, '/bulk-produce', events);
    }

    subscribe(subscriberName) {
        assertKeys(this.options, ['readApiKey']);
        if(!alphanumeric.test(subscriberName)) {
            throw new Error('Subscriber name must be a non-empty string of alphanumeric characters');
        }
        return topic(this, this.options.readApiKey, `/subscribe/${subscriberName}`);
    }

    poll(subscriberName) {
        assertKeys(this.options, ['readApiKey']);
        return topic(this, this.options.readApiKey, `/poll/${subscriberName}`);
    }

    commit(subscriberName) {
        assertKeys(this.options, ['readApiKey']);
        return topic(this, this.options.readApiKey, `/poll/${subscriberName}/commit`);
    }
}

function service(client, path='') {
    const url = `${client.options.endpoint}/v1/services/${client.options.serviceId}${path}`;

    return client.fetchImpl(url, {
        method: 'GET',
        headers: {
            'Authorization': client.options.readApiKey,
        },
        credentials: client.credentialsMode
    }).then((res) => {
        let msg;
        switch(res.status) {
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

export class PyroclastServiceClient extends BaseClient {
    requiredOptions() {
        return ['readApiKey', 'serviceId'];
    }

    readAggregates() {
        return service(this);
    }

    readAggregate(aggregateName) {
        return service(this, `/aggregates/${aggregateName}`);
    }

    readAggregateGroup(aggregateName, groupName) {
        return service(this, `/aggregates/${aggregateName}/group/${groupName}`);
    }
}
