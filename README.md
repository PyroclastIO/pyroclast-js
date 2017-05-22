## pyroclast-js

A JavaScript Node module for sending events to a Pyroclast topic.

## Usage

First, define a configuration.

```javascript
var client = new PyroclastClient({
    writeApiKey: "<your api token>",
    endpoint: "<pyroclast endpoint>",
    topicId: "<your topic id>",
    format: "json"
});
```

### Send one event asynchronously

```javascript
var cb = function(result) {
  console.log(result);
}

client.sendEvents(cb, [{"event-type": "page-visit", "page": "/home", "timestamp": 1495072835000}]);
```

### Send a batch of events asynchronously

```javascript
var cb = function(results) {
  console.log(results);
}

client.sendEvents(cb, [{"event-type": "page-visit", "page": "/home", "timestamp": 1495072835000},
                       {"event-type": "page-visit", "page": "/home", "timestamp": 1495072835000},
                       {"event-type": "page-visit", "page": "/home", "timestamp": 1495072835000}]);
```

## License

Copyright © 2017 Distibuted Masonry

Distributed under the Eclipse Public License either version 1.0 or (at
your option) any later version.
