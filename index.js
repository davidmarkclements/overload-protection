'use strict'

var loopbench = require('loopbench')

var frameworks = {
  express: require('./lib/express'),
  http: require('./lib/http'),
  koa: require('./lib/koa'),
  restify: require('./lib/restify')
}

var defaults = {
  production: process.env.NODE_ENV === 'production',
  errorPropagationMode: false,
  clientRetrySecs: 1,
  sampleInterval: 5,
  maxEventLoopDelay: 42,
  maxHeapUsedBytes: 0,
  maxRssBytes: 0,
  logging: false,
  logStatsOnReq: false
}

function protect (framework, opts) {
  opts = Object.assign({}, defaults, opts)
  if (typeof framework === 'undefined') {
    throw Error('Please specify a framework')
  }
  if (!(framework in frameworks)) {
    throw Error(opts.integrate + ' not supported.')
  }
  if (opts.maxRssBytes <= 0 && opts.maxHeapUsedBytes <= 0 && opts.eventLoopDelay <= 0) {
    throw Error('At least one threshold (eventLoopDelay, maxHeapUsedBytes, maxRssBytes) should be above 0')
  }
  if (opts.logStatsOnReq && opts.logging === false) {
    throw Error('logStatsOnReq cannot be enabled unless logging is also enabled')
  }
  var update = (opts.maxEventLoopDelay > 0)
    ? function update () {
      profiler.eventLoopOverload = eventLoopProfiler.overLimit
      profiler.eventLoopDelay = eventLoopProfiler.delay
      profiler.overload = profiler.eventLoopOverload ||
          profiler.heapUsedOverload ||
          profiler.rssOverload
    }
    : function update () {
      profiler.overload = profiler.heapUsedOverload || profiler.rssOverload
    }

  if (opts.maxEventLoopDelay > 0) {
    var eventLoopProfiler = loopbench({
      sampleInterval: opts.sampleInterval,
      limit: opts.maxEventLoopDelay
    })

    eventLoopProfiler.on('load', update)
    eventLoopProfiler.on('unload', update)
  }

  var maxHeapUsedBytes = opts.maxHeapUsedBytes
  var maxRssBytes = opts.maxRssBytes

  var timer = (maxHeapUsedBytes > 0 || maxRssBytes > 0) &&
    setInterval(checkMemory, opts.sampleInterval).unref()

  var profiler = {
    overload: false,
    eventLoopOverload: false,
    heapUsedOverload: false,
    rssOverload: false,
    eventLoopDelay: 0,
    maxEventLoopDelay: opts.maxEventLoopDelay,
    maxHeapUsedBytes: opts.maxHeapUsedBytes,
    maxRssBytes: opts.maxRssBytes,
    stop: stop
  }

  var integrate = frameworks[framework](opts, profiler)
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(profiler, Function.prototype)
    Object.setPrototypeOf(integrate, profiler)
  } else {
    profiler.__proto__ = Function.prototype // eslint-disable-line
    integrate.__proto__ = profiler // eslint-disable-line
  }

  return integrate

  function checkMemory () {
    var mem = process.memoryUsage()
    var heapUsed = mem.heapUsed
    var rss = mem.rss
    profiler.heapUsedOverload = (maxHeapUsedBytes > 0 && heapUsed > maxHeapUsedBytes)
    profiler.rssOverload = (maxRssBytes > 0 && rss > maxRssBytes)
    update()
  }

  function stop () {
    if (eventLoopProfiler) eventLoopProfiler.stop()
    clearInterval(timer)
  }
}

module.exports = protect
