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
  clientRetrySecs: 1,
  sampleInterval: 5,
  maxEventLoopDelay: 42,
  maxHeapUsedBytes: 0,
  maxRssBytes: 0
}

function protect (framework, opts) {
  opts = Object.assign({}, defaults, opts)
  if (typeof framework === 'undefined') {
    throw Error('Please specify a framework')
  }
  if (!(framework in frameworks)) {
    throw Error(opts.integrate + ' not supported.')
  }

  var eventLoopProfiler = loopbench({
    sampleInterval: opts.sampleInterval,
    limit: opts.maxEventLoopDelay
  })

  eventLoopProfiler.on('load', update)
  eventLoopProfiler.on('unload', update)

  var maxHeapUsedBytes = opts.maxHeapUsedBytes
  var maxRssBytes = opts.maxRssBytes

  var timer = (maxRssBytes > 0 || maxRssBytes > 0) &&
    setInterval(checkMemory, opts.sampleInterval).unref()

  var profiler = {
    overload: false,
    eventLoopOverload: false,
    heapOverload: false,
    rssOverload: false,
    eventLoopDelay: eventLoopProfiler.delay,
    maxEventLoopDelay: opts.maxEventLoopDelay,
    maxHeapUsedBytes: opts.maxHeapUsedBytes,
    maxRssBytes: opts.maxRssBytes,
    stop: stop
  }

  var integrate = frameworks[framework](opts, profiler)
  Object.setPrototypeOf(integrate, profiler)
  Object.setPrototypeOf(profiler, Function.prototype)

  return integrate

  function checkMemory () {
    var mem = process.memory()
    var heapUsed = mem.heapUsed
    var rss = mem.rss
    profiler.heapOverload = (maxHeapUsedBytes > 0 && heapUsed > maxHeapUsedBytes)
    profiler.rssOverload = (maxRssBytes > 0 && rss > maxRssBytes) 
    update()
  }

  function update () {
    profiler.eventLoopOverload = eventLoopProfiler.overLimit
    profiler.eventLoopDelay = eventLoopProfiler.delay
    profiler.overload = profiler.eventLoopOverload ||
      profiler.heapOverload ||
      profiler.rssOverload
  }

  function stop () {
    eventLoopProfiler.stop()
    clearInterval(timer)
  }
}

module.exports = protect
