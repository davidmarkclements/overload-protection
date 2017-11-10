# overload-protection 

Load detection and shedding capabilities for http, express, restify, fastify and koa

## About

`overload-protection` provides integration for your framework of choice.

If a threshold is crossed for a given metric, `overload-protection` 
will send an HTTP 503 Service Unavailable response, with (by default) 
a `Client-Retry` header, instructing the client (e.g. a browser or load balancer) to 
retry after a given amount of seconds.

Current supported metrics are:

* event loop delay (is the JavaScript thread blocking too long)
* Used Heap Memory 
* Total Resident Set Size

For a great explanation of Used Heap Memory vs Resident Set Size see 
Daniel Khans article at <https://www.dynatrace.com/blog/understanding-garbage-collection-and-hunting-memory-leaks-in-node-js>   

## Usage

Create a config object for your thresholds (and other `overload-protection`)
options.

```js
const protectCfg = {
  clientRetrySecs: 1, // Client-Retry header, in seconds (0 to disable) [default 1]
  sampleInterval: 5, // sample rate, milliseconds [default 5]
  maxEventLoopDelay: 42, // maximum detected delay between event loop ticks [default 42]
  maxHeapUsedBytes: 0, // maximum heap used threshold (0 to disable) [default 0]
  maxRssBytes: 0, // maximum rss size threshold (0 to disable) [default 0]
  errorPropagationMode: false // dictate behavior: take over the response 
                              // or propagate an error to the framework [default false]
}
```

Then pass the framework we're integrating with along with the configuration object.

For instance with Express we would do:

```js
const app = require('express')()
const protect = require('overload-protection')('express', protectCfg)
app.use(protect)
```

With middleware based frameworks, always put the `overload-protection` middleware
first. In default mode this means `overload-protection` will take over the response
and prevent any other middleware from executing (thus taking further potential pressure off
of the process).

Restify, Fastify, and Koa all work in much the same way, call the `overload-protection`
module with the name of the framework, a config object and pass the resulting `protect`
instance to `app.use` – e.g. Koa would be:

```js
const Koa = require('koa')
const protect = require('overload-protection')('koa', protectCfg)
const app = new Koa()
app.use(protect)
```

For pure core HTTP the `overload-protection` instance can be called
at the top of the request handler function. With two arguments (just `req` and `res`)
the function will return `true` if protection/shedding has been provided, or `false`
if not. If `overload-protection` *has* taken over (the `true` case), then we should
exit the function and do no further work:

```js
const http = require('http')
const protect = require('overload-protection')('http', protectCfg)

http.createServer(function (req, res) {
  if (protect(req, res) === true) return
  res.end('content')
})
```

With three arguments (the third argument being a callback), the rest of the 
work should be done within the supplied callback.

```js
const http = require('http')
const protect = require('overload-protection')('http', protectCfg)

http.createServer(function (req, res) {
  protect(req, res, function () {
    // when errorPropagationMode mode is false, will *only* 
    // be called if load shedding didn't occur
    // (if it was true we'd need to check for an Error object as first arg)
    res.end('content')
  })
})
```

## Installation

```sh
npm install overload-protection --save
```

## Tests

```sh
npm install
npm test
```

## API

### require('overload-protection') => (framework, opts) => instance

The `framework` argument is non-optional. It's a string and may be one of:

* express
* fastify
* koa
* restify
* http

The `opts` argument is optional, as are all properties.

Options (particularly thresholds) are quite sensitive and highly relevant on 
a case by case basis. Possible options are as follows:

#### clientRetrySecs: 1

By default, `overload-protection` will add a header to the 503 response
called `Client-Retry`. It's up to the client to honour this header, which
instructs the client on how many seconds to wait between retries. 
Defaults to 1 seconds.

#### sampleInterval: 5

In order to establish whether a threshold has been crossed, the metrics 
are sampled at a regular interval. The interval defaults to 5 milliseconds.

####  maxEventLoopDelay: 42

Synchronous work causes the event loop to freeze, when this happens 
an interval timer (which is our sampler) will be delayed by the amount
of time the event loop was stalled for while the thread processed synchronous 
work. We can measure this with timestamp comparison. This option sets a threshold
for the maximum amount of stalling between intervals we'll accept before our
servive begins responding with 503 codes to requests. Defaults to 42 milliseconds. 

#### maxHeapUsedBytes: 0

Disabled by default (set to 0), this defines maximum V8 (Node's JavaScript engine) used heap size.

If the Used Heap size exceeds the threshold the server will begin return 503 error codes
until it crosses back under the threshold. 

See <https://www.dynatrace.com/blog/understanding-garbage-collection-and-hunting-memory-leaks-in-node-js>
for more info on Used Heap from a V8 context.

#### maxRssBytes: 0

Disabled by default (set to 0) maximum process Resident Set Size. If
the RSS exceeds the threshold the server will begin return 503 error codes
until it crosses back under the threshold.

#### errorPropagationMode: false 

**This is relevant to middleware integration only**

By default, `overload-protection` will handle and end the response, 
without calling any subsequent configured middleware. The point here 
is to avoid any further processing for an already (by definition) 
over loaded process.

However, it could be argued, from a puritanical perspective, that middleware
should defer to the framework and that any HTTP code of 500 or above should 
be generated by propagating an error through the framework. 

This option prevents `overload-protection` from manually ended the response and
instead generates an `Error` object (with additional properties as per [`http-errors`](https://github.com/jshttp/http-errors) as used by Express and Koa)     
and propagates it through the framework (either by throwing it in Koa, or passing through the `next` callback).

### instance.overload

The returned instance (which in many cases is passed as middleware to `app.use`), 
has an `overload` property. This begins as `false`. If any of the thresholds have 
been passed this will be set to `true`. Once all metrics are below their thresholds
this would become `false` again.

This allows for any heavy load detection required outside of a framework.

Alias: `overLimit` 

### profiler.eventLoopOverload

The returned instance (which in many cases is passed as middleware to `app.use`), 
has an `eventLoopOverload` property. This begins as `false`. If the `maxEventLoopDelay`
threshold is passed this will be set to `true`. Once it's below the configured threshold
this would become `false` again.

This allows for any event loop delay detection necessary outside of a framework.

### profiler.heapOverload

The returned instance (which in many cases is passed as middleware to `app.use`), 
has a `heapOverload` property. This begins as `false`. If the `maxHeapUsedBytes`
threshold is passed this will be set to `true`. Once it's below the configured threshold
this would become `false` again.

This allows for any heap used threshold detection necessary outside of a framework.

### profiler.rssOverload

The returned instance (which in many cases is passed as middleware to `app.use`), 
has a `rssOverload` property. This begins as `false`. If the `maxRssBytes`
threshold is passed this will be set to `true`. Once it's below the configured threshold
this would become `false` again.

This allows for any heap used threshold detection necessary outside of a framework.

### instance.delay

The delay in milliseconds (with additional decimal precision) since the last sample.

### instance.maxEventLoopDelay

Corresponds to the `opts.maxEventLoopDelay` option.

Alias: `instance.limit`

### instance.maxHeapUsedBytes

Corresponds to the `opts.maxHeapUsedBytes` option.

### instance.maxRssBytes

Corresponds to the `opts.maxRssBytes` option.

## Dependencies

- [loopbench](https://github.com/mcollina/loopbench): Benchmark your event loop

## Dev Dependencies

- [express](https://github.com/expressjs/express): Fast, unopinionated, minimalist web framework
- [fastify](https://github.com/fastify/fastify): Fast and low overhead web framework, for Node.js
- [koa](https://github.com/koajs/koa): Koa web app framework
- [koa-router](https://github.com/alexmingoia/koa-router): Router middleware for koa. Provides RESTful resource routing.
- [restify](https://github.com/restify/node-restify): REST framework
- [standard](https://github.com/standard/standard): JavaScript Standard Style
- [tap](https://github.com/tapjs/node-tap): A Test-Anything-Protocol library


## License

MIT