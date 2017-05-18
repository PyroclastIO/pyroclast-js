## pyroclast-js

A JavaScript Node module for sending events to a Pyroclast topic.

## Usage

```javascript
var PyroclastClient = require("pyroclast");

var client = new PyroclastClient({
    userToken: "<your user token>",
    apiToken: "<your api token>
    endpoint: "<pyroclast endpoint>
    topicId: "<your topic id>",
    format: "json"
});

client.sendEvent({"event-type": "page-visit", "page": "/home", "timestamp": 1495072835000});
```

## License

Copyright © 2017 Distibuted Masonry

Distributed under the Eclipse Public License either version 1.0 or (at
your option) any later version.
