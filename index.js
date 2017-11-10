'use strict'

var loopbench = require('loopbench')

var frameworks = {
  express: require('./lib/express'),
  http: require('./lib/http'),
  koa: require('./lib/koa'),
  fastify: require('./lib/fastify'),
  restify: require('./lib/restify')
}

var defaults = {
  errorPropagationMode: false,
  production: false,
  integrate: 'http',
  clientRetryWait: 10,
  sampleInterval: 5,
  maxEventLoopDelay: 42,
  maxHeapUsedBytes: 0,
  maxRssBytes: 0
}


function protect (framework, opts) {
  framework = framework || 'http'
  opts = Object.assign({}, defaults, opts)

  if (!(framework in frameworks)) {
    throw Error(opts.integrate + ' not supported.')
  }

  var eventLoopProfiler = loopbench({
    sampleInterval: opts.sampleInterval,
    limit: opts.maxEventLoopDelay
  })

  var maxHeapUsedBytes = opts.maxHeapUsedBytes
  var maxRssBytes = opts.maxRssBytes
  //be sure to create profiler first, so it registers
  //in the timer queue before our timer, then our timer
  //can rely on the profiler.overLimit value
  var profiler = Object.create(eventLoopProfiler)

  var timer = (maxRssBytes > 0 || maxRssBytes > 0) &&
    setInterval(checkMemory, opts.sampleInterval).unref()

  profiler.overload = false
  profiler.eventLoopOverload = false
  profiler.heapOverload = false
  profiler.rssOverload = false

  profiler.on('load', apiMap)
  profiler.on('unload', apiMap)

  profiler.stop = stop

  var integration = frameworks[framework](opts, profiler)

  // make the profiler the proto of the integration function,
  // so we have a function which also has all the (live) properties
  // of the profiler
  Object.setPrototypeOf(integration, profiler)

  // since the prototype of the integration Function is overwritten, it 
  // loses function methods, like .call. This reintroduces the function methods, 
  // without modifying shared prototypes (e.g. we create an object and copy properties)
  Object.setPrototypeOf(eventLoopProfiler, Object.assign(
    Object.create(Function.prototype), 
    Object.getPrototypeOf(eventLoopProfiler)
  ))

  return integration

  function checkMemory () {
    var mem = process.memory()
    var heapUsed = mem.heapUsed
    var rss = mem.rss
    profiler.heapOverload = (maxHeapUsedBytes > 0 && heapUsed > maxHeapUsedBytes)
    profiler.rssOverload = (maxRssBytes > 0 && rss > maxRssBytes) 
    process.nextTick(setOverload)
  }

  function setOverload () {
    profiler.overload = profiler.eventLoopOverload ||
      profiler.heapOverload ||
      profiler.rssOverload
  }

  function apiMap () {
    profiler.eventLoopOverload = profiler.overLimit
    setOverload() // may not have to do this here, since the 
  }

  function stop () {
    eventLoopProfiler.stop()
    clearInterval(timer)
  }
}

module.exports = protect
