## pyroclast-js

Browser + Node.js support for sending events to a Pyroclast topic.

## Installation

```bash
npm install --save pyroclast
```

## Usage

First, define a configuration.

```javascript
const pyroclast = require('pyroclast');

const client = new pyroclast.PyroclastClient({
    writeApiKey: "<your api token>",
    topicId: "<your topic ID>",
    endpoint: "<pyroclast endpoint>"
});
```

### Send one event asynchronously

```javascript
client
    .sendEvent({type: "page-visit", page: "/home", timestamp: 1495072835000})
    .then((result) => {
        // ...
    });
```

### Send a batch of events asynchronously

```javascript
client
    .sendEvents([
        {type: "page-visit", page: "/home", timestamp: 1495072835000},
        {type: "page-visit", page: "/home", timestamp: 1495072836000},
        {type: "page-visit", page: "/home", timestamp: 1495072837000}
    ])
    .then((results) => {
        // ...
    });
```

## Supplying a [Fetch](https://fetch.spec.whatwg.org/) implementation

By default:
* In the browser, the native `window.fetch` implementation is used, if available (as in modern browsers).
* In Node.js, `node-fetch` is used.

To override this behavior:
A. (Browser/Node.js) Pass the implementation as the `fetchImpl` option, or
B. (Browser only) Use a polyfill to define fetch globally.

Note that to support older browsers, you will likely also need a Promise polyfill.

## License

(The MIT License)

Copyright © 2017 Distibuted Masonry

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
