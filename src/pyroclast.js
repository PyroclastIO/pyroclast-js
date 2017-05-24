function send(client, payloadKind, payload) {
    const url = `${client.endpoint}/api/v${client.version}/topic/${client.topicId}/${payloadKind}`;

    return client.fetchImpl(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Authorization': client.writeApiKey,
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

function readServiceAggregate(client, urlF) {
    const url = urlF(`${client.endpoint}/api/v${client.version}/service/${client.serviceId}`);

    return client.fetchImpl(url, {
        method: 'GET',
        headers: {
            'Authorization': client.readApiKey,
        },
        credentials: client.credentialsMode
    }).then((res) => {
        let msg;
        switch(res.status) {
        case 200:
            var json = res.json();
            return {"success": true, "aggregates": json};
        case 401:
            msg = 'API key is not authorized to perform this action';
            break;
        case 404:
            msg = 'Aggregate not found';
            break;
        default:
            msg = res.statusText || 'unknown';
        }

        let err = new Error(msg);
        err.success = false;
        err.status = res.status;
        err.responseHeaders = res.headers;
        throw err;
    });
}

function defaultFetch() {
    if('undefined' !== typeof process && 
       Object.prototype.toString.call(process) === '[object process]') {
        return require('node-fetch');
    }

    if(window.hasOwnProperty('fetch')) {
        return window.fetch; 
    }

    throw new Error('No fetch implmentation found. Provide support via polyfill or by supplying the `fetchImpl` option.');
}

export class PyroclastTopicClient {
    constructor({writeApiKey,
                 topicId,
                 endpoint,
                 version=1,
                 credentialsMode='include',
                 fetchImpl=defaultFetch()}) {
        if(!writeApiKey || !topicId || !endpoint) {
            throw new Error('Required configuration not specified.');
        }
        
        this.writeApiKey = writeApiKey;
        this.topicId = topicId;
        this.endpoint = endpoint;
        this.version = version;
        this.fetchImpl = fetchImpl; 
    }

    sendEvent(event) {
        return send(this, 'event', event);
    }

    sendEvents(events) {
        return send(this, 'events', events);
    }
}

export class PyroclastServiceClient {
    constructor({readApiKey,
                 serviceId,
                 endpoint,
                 version=1,
                 credentialsMode='include',
                 fetchImpl=defaultFetch()}) {
        if(!readApiKey || !serviceId || !endpoint) {
            throw new Error('Required configuration not specified.');
        }

        this.readApiKey = readApiKey;
        this.serviceId = serviceId;
        this.endpoint = endpoint;
        this.version = version;
        this.fetchImpl = fetchImpl;
    }

    readAggregates() {
        return readServiceAggregate(this, function(url) { return url; });
    }

    readAggregate(aggregateName) {
        return readServiceAggregate(this, function(url) { return url + "/aggregate/" + aggregateName; });
    }

    readAggregateGroup(aggregateName, groupName) {
        return readServiceAggregate(this, function(url) { return url + "/aggregate/" + aggregateName + "/group/" + groupName });
    }
}
