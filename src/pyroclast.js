function PyroclastClient(config) {
    this.config = {
        userToken: config.userToken,
        writeApiKey: config.writeApiKey,
        endpoint: config.endpoint,
        topicId: config.topicId,
        format: config.format
    };
}

function processResponse(xhr) {
    switch (xhr.status) {
    case 200:
        return JSON.parse(xhr.response);

    case 400:
        return {"created": false, "reason": "Event data was malformed"};

    case 401:
        return {"created": false, "reason": "API key unauthorized to perform this action"};

    default:
        return {"created": false, "reason": "unknown", "response": xhr};
    }
}

PyroclastClient.prototype.sendEvent = function(callback, event) {
    var xhr = new XMLHttpRequest();
    var url = this.config.endpoint + "/api/v1/topic/" + this.config.topicId + "/event";
    xhr.open("POST", url, true);

    xhr.setRequestHeader("Authorization", this.config.writeApiKey);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function()
    {
        if (xhr.readyState == 4) {
            callback(processResponse(xhr));
        }
    }
    
    xhr.send(JSON.stringify(event));
}

PyroclastClient.prototype.sendEvents = function(callback, events) {
    var xhr = new XMLHttpRequest();
    var url = this.config.endpoint + "/api/v1/topic/" + this.config.topicId + "/events";
    xhr.open("POST", url, true);

    xhr.setRequestHeader("Authorization", this.config.writeApiKey);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function()
    {
        if (xhr.readyState == 4) {
            callback(processResponse(xhr));
        }
    }

    xhr.send(JSON.stringify(events));
}

module.exports = PyroclastClient;
