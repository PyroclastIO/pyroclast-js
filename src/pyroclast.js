function PyroclastClient(config) {
    this.config = {
        userToken: config.userToken,
        apiToken: config.apiToken,
        endpoint: config.endpoint,
        topicId: config.topicId,
        format: config.format
    };
}

PyroclastClient.prototype.sendEvent = function(event) {
    var xhr = new XMLHttpRequest();
    var url = this.config.endpoint + "/plume/_bulk?topic-id=" + this.config.topicId;
    xhr.open("POST", url, true);

    xhr.setRequestHeader("Authorization", "Basic " + btoa(this.config.userToken + ":" + this.config.apiToken));
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");

    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === 4) {
            console.log(xhr.responseText);
            var response = JSON.parse(xhr.responseText);
            if (xhr.status === 200 && response.status === 'OK') {
                console.log('successful');
            } else {
                console.log('failed');
            }
        }
    }
    
    xhr.send(JSON.stringify(event));
}

module.exports = PyroclastClient;
