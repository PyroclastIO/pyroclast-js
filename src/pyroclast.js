function defaultFetch() {
    if('undefined' !== typeof process && 
       Object.prototype.toString.call(process) === '[object process]') {
        return require('node-fetch');
    }

    if(window.hasOwnProperty('fetch')) {
        return (...args) => window.fetch.apply(window, args);
    }

    throw new Error('No fetch implmentation found. Provide support via polyfill or by supplying the `fetchImpl` option.');
}

class BaseClient {
    constructor(opts) {
        const missingOption = this.requiredOptions().find((k) => !opts.hasOwnProperty(k));

        if(missingOption) {
            throw new Error(`Required configuration not specified: ${missingOption}.`);
        }

        const {credentialsMode='include', fetchImpl=defaultFetch()} = opts;

        this.credentialsMode = credentialsMode;
        this.fetchImpl = fetchImpl;
        this.options = opts;
    }
    
    requiredOptions() {
        return [];
    }
}

function write(client, path, payload) {
    const url = `${client.options.endpoint}/api/v1/topic/${client.options.topicId}${path}`;

    return client.fetchImpl(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Authorization': client.options.writeApiKey,
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

export class PyroclastTopicClient extends BaseClient {
    requiredOptions() {
        return ['endpoint', 'topicId', 'writeApiKey'];
    }

    sendEvent(event) {
        return write(this, '/produce', event);
    }

    sendEvents(events) {
        return write(this, '/bulk-produce', events);
    }
}

function read(client, path='') {
    const url = `${client.options.endpoint}/api/v1/service/${client.options.serviceId}${path}`;

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
        return ["readApiKey", "serviceId", "endpoint"];
    }

    readAggregates() {
        return read(this);
    }

    readAggregate(aggregateName) {
        return read(this, `/aggregate/${aggregateName}`);
    }

    readAggregateGroup(aggregateName, groupName) {
        return read(this, `/aggregate/${aggregateName}/group/${groupName}`);
    }
}
