'use strict'

var explain = require('./explain')
var OverloadProtectionStats = require('./stats')

module.exports = http

function http (opts, protect) {
  var clientRetrySecs = opts.clientRetrySecs
  var sendRetryHeader = clientRetrySecs > 0
  var logStatsOnReq = opts.logStatsOnReq
  var logging = opts.logging
  var loggingOn = typeof logging === 'string' || typeof logging === 'function'
  var log4jLogging = typeof logging === 'string'
  var errorPropagationMode = opts.errorPropagationMode
  var production = opts.production
  var expose = !production

  return overloadProtection

  function overloadProtection (req, res, next) {
    if (logStatsOnReq) {
      const stats = new OverloadProtectionStats(
        protect.overload,
        protect.eventLoopOverload,
        protect.heapUsedOverload,
        protect.rssOverload,
        protect.eventLoopDelay,
        protect.maxEventLoopDelay,
        protect.maxHeapUsedBytes,
        protect.maxRssBytes
      )
      if (log4jLogging) req.log && req.log[logging] && req.log[logging](stats)
      else logging(stats)
    }
    if (protect.overload === true) {
      res.statusCode = 503
      if (sendRetryHeader) res.setHeader('Retry-After', clientRetrySecs)
      if (loggingOn) {
        if (log4jLogging) req.log && req.log[logging] && req.log[logging](explain(protect))
        else logging(explain(protect))
      }
      if (errorPropagationMode && typeof next === 'function') {
        var err = Error(explain(protect))
        err.expose = expose
        err.statusCode = 503
        next(err)
        return
      }

      res.end(production ? 'Service Unavailable' : explain(protect))

      if (arguments.length < 3) return true
      else return
    }
    if (arguments.length >= 3 && typeof next === 'function') next()
    else return false
  }
}
