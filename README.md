## pyroclast-js

Browser + Node.js support for sending events to a Pyroclast topic.

## Installation

```bash
npm install --save pyroclast
```

## Topic APIs

### Write events

First, start the client.

```javascript
const pyroclast = require('pyroclast');

const topicClient = new pyroclast.PyroclastTopicClient({
    writeApiKey: "<your api token>",
    topicId: "<your topic ID>"
});
```

#### Send one event asynchronously

```javascript
topicClient
    .sendEvent({type: "page-visit", page: "/home", timestamp: 1495072835000})
    .then((result) => {
        // ...
    });
```

#### Send a batch of events asynchronously

```javascript
topicClient
    .sendEvents([
        {type: "page-visit", page: "/home", timestamp: 1495072835000},
        {type: "page-visit", page: "/home", timestamp: 1495072836000},
        {type: "page-visit", page: "/home", timestamp: 1495072837000}
    ])
    .then((results) => {
        // ...
    });
```

### Reading events

Start the client.

```javascript
const pyroclast = require('pyroclast');

const topicClient = new pyroclast.PyroclastTopicClient({
    readApiKey: "<your api token>",
    topicId: "<your topic ID>"
});
```

#### Subscribe to a topic

```javascript
topicClient.subscribe("my-example-subscription");
```

#### Poll subscribed topic

```javascript
topicClient
    .poll("my-example-subscription")
    .then((result) => {
        // ...
    });
```

#### Commit read records

```javascript
topicClient
    .commit("my-example-subscription")
    .then((result) => {
        // ...
    });
```

## Supplying a [Fetch](https://fetch.spec.whatwg.org/) implementation

By default:
* In the browser, the native `window.fetch` implementation is used, if available (as in modern browsers).
* In Node.js, `node-fetch` is used.

To override this behavior:
* (Browser/Node.js) Pass the implementation as the `fetchImpl` option, or
* (Browser only) Use a polyfill to define fetch globally.

Note that to support older browsers, you will likely also need a Promise polyfill.

## License

(The MIT License)

Copyright © 2017 Distributed Masonry
