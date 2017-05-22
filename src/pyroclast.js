function send(client, topicId, payloadKind, payload) {
    const url = `${client.endpoint}/api/v${client.version}/topic/${topicId}/${payloadKind}`;

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

export class PyroclastClient {
    constructor({writeApiKey,
                 endpoint,
                 version=1,
                 credentialsMode='include',
                 fetchImpl=defaultFetch()}) {
        if(!writeApiKey || !endpoint) {
            throw new Error('Required configuration not specified.');
        }
        
        this.writeApiKey = writeApiKey;
        this.endpoint = endpoint;
        this.version = version;
        this.fetchImpl = fetchImpl; 
    }

    sendEvent(topicId, event) {
        return send(this, topicId, 'event', event);
    }

    sendEvents(topicId, events) {
        return send(this, topicId, 'events', events);
    }
}
